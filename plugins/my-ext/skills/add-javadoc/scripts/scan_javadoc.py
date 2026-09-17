#!/usr/bin/env python3
"""
扫描 Java Service 接口和实现类，检测缺失或不完整的 JavaDoc 注释。

输出 JSON 报告，供 add-javadoc skill 使用。

用法:
    python scan_javadoc.py <项目根目录>                         # 全量扫描 *Service.java 和 *ServiceImpl.java
    python scan_javadoc.py <项目根目录> --module component      # 指定模块
    python scan_javadoc.py <项目根目录> --files X.java Y.java   # 指定文件
    python scan_javadoc.py <项目根目录> -p "**/*Controller.java" # 自定义 glob 模式
    python scan_javadoc.py <项目根目录> --json                  # JSON 输出到 stdout
    python scan_javadoc.py <项目根目录> --summary               # 仅输出汇总
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ============================================================
# 数据模型
# ============================================================

@dataclass
class ParamInfo:
    name: str
    has_description: bool  # @param 后面是否有说明文字


@dataclass
class MethodJavadocStatus:
    method_name: str
    signature_line: str  # 方法签名首行
    line_number: int  # 方法在文件中的行号 (1-based)
    has_javadoc: bool
    javadoc_lines: list = field(default_factory=list)  # 已有的 JavaDoc 原始行
    params: list = field(default_factory=list)  # ParamInfo 列表
    missing_params: list = field(default_factory=list)  # 缺少 @param 的参数名
    empty_desc_params: list = field(default_factory=list)  # @param 存在但描述为空的参数名
    has_return: bool = False
    return_empty: bool = False  # 有 @return 标签但描述为空
    missing_return: bool = False  # 有返回值但没写 @return
    has_throws: bool = False
    throws_types: list = field(default_factory=list)  # 签名中声明的异常类型
    missing_throws: list = field(default_factory=list)  # 缺少 @throws 的异常类型
    is_complete: bool = False  # 注释是否完整

    def needs_attention(self) -> bool:
        """是否需要补充/完善 JavaDoc"""
        if not self.has_javadoc:
            return True
        if self.missing_params or self.empty_desc_params:
            return True
        if self.missing_return or self.return_empty:
            return True
        if self.missing_throws:
            return True
        return False


@dataclass
class FileReport:
    file_path: str  # 绝对路径
    relative_path: str  # 相对路径
    is_interface: bool
    has_class_javadoc: bool
    class_name: str
    interface_name: Optional[str] = None  # 实现类实现的接口名
    has_bom: bool = False  # 文件是否有 UTF-8 BOM
    methods: list = field(default_factory=list)  # MethodJavadocStatus 列表

    def methods_needing_attention(self):
        return [m for m in self.methods if m.needs_attention()]

    def ok_count(self):
        return sum(1 for m in self.methods if m.is_complete)

    def need_count(self):
        return sum(1 for m in self.methods if m.needs_attention())

    def needs_attention(self):
        return not self.has_class_javadoc or self.need_count() > 0


# ============================================================
# 解析逻辑
# ============================================================

def find_java_files(root: Path, module: Optional[str] = None, files: Optional[list] = None,
                    patterns: Optional[list] = None) -> list:
    """查找需要扫描的 Java Service 文件"""
    if files:
        resolved = []
        for file_name in files:
            path = Path(file_name)
            if not path.is_absolute():
                path = root / path
            resolved.append(str(path.resolve()))
        return resolved

    if patterns is None:
        patterns = ["**/*Service.java", "**/*ServiceImpl.java"]

    if module:
        search_root = root / module
    else:
        search_root = root

    results = []
    for pattern in patterns:
        for f in search_root.rglob(pattern):
            # 排除测试目录
            if "test" not in str(f).lower().replace("\\", "/").split("/"):
                results.append(str(f.resolve()))
    return sorted(set(results))


def read_file_lines(file_path: str) -> list:
    """读取文件所有行，返回带行号的列表 [(line_no, content), ...]"""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.readlines()


def has_bom(file_path: str) -> bool:
    """检测文件是否以 UTF-8 BOM (EF BB BF) 开头"""
    with open(file_path, "rb") as f:
        return f.read(3) == b'\xef\xbb\xbf'


def extract_class_name(lines: list) -> tuple:
    """提取类名/接口名，以及是否接口、实现的接口名"""
    full_text = "".join(lines)
    is_interface = False
    interface_name = None

    # 匹配 interface 声明
    type_modifiers = r'(?:(?:abstract|final|sealed|non-sealed)\s+)*'
    m = re.search(rf'public\s+{type_modifiers}interface\s+(\w+)', full_text)
    if m:
        is_interface = True
        return m.group(1), is_interface, None

    # 匹配 class 声明 (含 extends + implements)
    m = re.search(
        rf'public\s+{type_modifiers}class\s+(\w+)\s+'
        rf'(?:extends\s+[\w<>,.\s]+\s+)?implements\s+([\w,\s]+)',
        full_text,
    )
    if m:
        class_name = m.group(1)
        interfaces = [i.strip() for i in m.group(2).split(",")]
        return class_name, False, interfaces[0] if interfaces else None

    # 普通 class 无 implements
    m = re.search(rf'public\s+{type_modifiers}(?:class|record)\s+(\w+)', full_text)
    if m:
        return m.group(1), False, None

    return None, False, None


def has_class_javadoc(lines: list) -> bool:
    """检查类/接口是否有 JavaDoc 注释（排除仅有作者/日期的注释）"""
    text_before_class = ""
    for line in lines:
        text_before_class += line
        # 遇到 class/interface 声明时停止
        if re.search(
            r'public\s+(?:(?:abstract|final|sealed|non-sealed)\s+)*(?:class|interface|record)\s+\w+',
            text_before_class,
        ):
            break

    # 找到最后一个 /** ... */ 块
    javadoc_blocks = re.findall(r'/\*\*(.*?)\*/', text_before_class, re.DOTALL)
    if not javadoc_blocks:
        return False

    # 检查最后一个块是否是类注释（在 class 声明上方不远处）
    last_block = javadoc_blocks[-1]
    # 排除仅作者/日期的注释：内容只有 ex-xxx 或日期格式
    content = last_block.strip()
    if re.match(r'^\s*(ex-\w+)?\s*\d{4}-\d{1,2}-\d{1,2}\s*$', content):
        return False
    if len(content) < 3:  # 几乎是空的
        return False
    return True


def extract_methods(lines: list, is_interface: bool = False, class_name: Optional[str] = None) -> list:
    """
    提取所有 public 方法的签名信息和行号。
    对于接口，同时匹配省略 public 关键字的方法。
    返回 [(method_name, full_signature, start_line, throws_list), ...]
    """
    methods = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # 跳过空行
        if not line:
            i += 1
            continue
        # 跳过 import / package
        if line.startswith("import ") or line.startswith("package "):
            i += 1
            continue
        # 跳过单行注释
        if line.startswith("//") or line.startswith("/*") or line.startswith("*"):
            i += 1
            continue
        # 跳过注解行（但只跳过单独注解行，不跳过带方法签名的行）
        if line.startswith("@") and "(" not in line:
            i += 1
            continue
        # 跳过 class / interface / enum 声明
        if re.match(r'^\s*(public\s+)?(class|interface|enum|@interface)\s', line):
            i += 1
            continue
        # 跳过字段声明
        if line.endswith(";") and "(" not in line:
            i += 1
            continue

        # 方法检测：public/protected/package-private；接口额外支持 default/static/private
        is_method = False
        if re.match(r'^\s*(public|protected)\s+', line):
            is_method = True
        elif is_interface:
            # 接口方法：含 default、static、private（Java 9+）
            if re.match(r'^\s*(static\s+|default\s+|private\s+)?[\w<>\[\],\s]+\s+\w+\s*\(', line):
                is_method = True
        else:
            # 包级权限方法（无访问修饰符），= 出现在 ( 前视为变量赋值，排除
            before_paren = line.split('(')[0] if '(' in line else line
            if re.match(r'^\s*(static\s+|synchronized\s+|final\s+)*[\w<>\[\],\s]+\s+\w+\s*\(', line) \
               and '=' not in before_paren:
                is_method = True

        if not is_method:
            i += 1
            continue

        # 收集完整的方法签名（可能跨多行）
        sig_lines = [lines[i]]
        start_line = i
        j = i
        current_signature = "".join(sig_lines)
        if "{" not in current_signature and not (";" in current_signature and "(" in current_signature):
            j = i + 1
            while j < len(lines):
                sig_lines.append(lines[j])
                combined = "".join(sig_lines)
                if "{" in combined or (";" in combined and "(" in combined):
                    break
                j += 1

        full_sig = "".join(sig_lines).strip()

        # 提取方法名
        method_match = re.search(r'(\w+)\s*\(', full_sig)
        if not method_match:
            i = j + 1
            continue
        method_name = method_match.group(1)

        # 过滤掉不是方法的关键字
        if method_name in ("if", "for", "while", "switch", "catch", "synchronized", "try", "return", "throw", "new"):
            i = j + 1
            continue
        if class_name and method_name == class_name:
            i = j + 1
            continue

        # 提取 throws
        throws_match = re.search(r'throws\s+(.+?)(?:\{|$)', full_sig)
        throws_list = []
        if throws_match:
            throws_list = [t.strip() for t in throws_match.group(1).split(",")]

        methods.append({
            "name": method_name,
            "signature": full_sig,
            "line_number": start_line + 1,
            "throws": throws_list,
            "signature_end_line": j,
        })

        i = j + 1

    return methods


def split_by_comma_respecting_generics(s: str) -> list:
    """按逗号分割参数列表，忽略尖括号 <> 内的逗号（泛型嵌套）"""
    parts = []
    depth = 0
    current = []
    for ch in s:
        if ch == '<':
            depth += 1
        elif ch == '>':
            depth -= 1
        elif ch == ',' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(ch)
    remainder = ''.join(current).strip()
    if remainder:
        parts.append(remainder)
    return parts


def extract_params_from_sig(signature: str) -> list:
    """从方法签名中提取参数名列表"""
    # 提取括号内的参数（到最后一个 ) 之前，避免匹配方法体）
    # 找到参数列表结束的位置：匹配最后一个 ) 在 { 或 ; 之前
    sig_before_body = re.match(r'^(.*?\))\s*(?:throws\s|$|\{|;)', signature, re.DOTALL)
    if sig_before_body:
        sig_trimmed = sig_before_body.group(1)
    else:
        sig_trimmed = signature

    # 找最外层的括号内容
    paren_start = sig_trimmed.find('(')
    paren_end = sig_trimmed.rfind(')')
    if paren_start == -1 or paren_end == -1:
        return []

    params_str = sig_trimmed[paren_start + 1:paren_end].strip()
    if not params_str:
        return []

    param_names = []
    for param in split_by_comma_respecting_generics(params_str):
        param = param.strip()
        # 格式可能是: @Annotation Type name 或 Type... name 或 Type<A,B> name
        # 用空格分割，取最后一个小写开头的 token（跳过注解、final、类型）
        parts = param.split()
        if not parts:
            continue

        # 从右往左找第一个合法的参数名（小写开头，不是关键字/注解/修饰符）
        for part in reversed(parts):
            # 跳过注解 @Foo
            if part.startswith('@'):
                continue
            # 跳过修饰符
            if part in ('final',):
                continue
            # 跳过泛型残余（> 结尾或纯类型名大写开头）
            if part.endswith('>'):
                continue
            # 参数名小写开头，或者下划线开头
            if part and (part[0].islower() or part[0] == '_'):
                # 但也要排除原始类型关键字
                if part in ('int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char'):
                    continue
                # 跳过 ...name 中的 ...
                if part.startswith('...'):
                    part = part[3:]
                param_names.append(part)
                break

    return param_names


def extract_return_type(signature: str) -> Optional[str]:
    """从方法签名中提取返回类型，返回 None 表示 void"""
    # 匹配: [修饰符...] 返回类型 方法名( — 修饰符和 public/protected/private/static 等
    m = re.match(
        r'^\s*(?:(?:public|protected|private|static|synchronized|abstract|default|final)\s+)*'
        r'(.+?)\s+\w+\s*\(',
        signature, re.DOTALL
    )
    if not m:
        return None
    ret = m.group(1).strip()
    if ret == "void":
        return None
    # 去掉残余修饰符（可能跨行被捕获）
    ret = re.sub(r'\b(static|synchronized|abstract|default|final)\s+', '', ret).strip()
    return ret if ret else None


def extract_existing_javadoc(lines: list, method_start_line: int) -> tuple:
    """
    检查方法前的 JavaDoc。
    从 method_start_line - 2 向上找，跳过 @Override 等注解和空行。
    返回 (has_javadoc, javadoc_lines, javadoc_text)
    """
    i = method_start_line - 2  # 0-based, 方法上一行
    if i < 0:
        return False, [], ""

    # 向上扫描
    collected_lines = []
    in_javadoc = False
    javadoc_end = -1

    while i >= 0:
        stripped = lines[i].strip()

        if stripped.startswith("*/"):
            in_javadoc = True
            javadoc_end = i
            i -= 1
            continue

        if in_javadoc:
            collected_lines.insert(0, stripped)
            if stripped.startswith("/**") or stripped == "/**":
                break
            i -= 1
            continue

        # 不在 JavaDoc 中，允许跳过注解和空行继续向上找
        if stripped.startswith("@") or stripped == "":
            i -= 1
            continue
        else:
            # 碰到非注解非空行，且没有 JavaDoc 结束标记，说明没有 JavaDoc
            break

    if collected_lines:
        javadoc_text = "\n".join(collected_lines)
        return True, collected_lines, javadoc_text

    return False, [], ""


def has_return_in_javadoc(javadoc_text: str) -> tuple:
    """检查 JavaDoc 中是否有 @return 以及描述是否非空"""
    m = re.search(r'@return\s*(.*?)(?:\n|$)', javadoc_text)
    if not m:
        return False, False
    desc = m.group(1).strip()
    return True, (desc == "" or desc in ("None", "null"))


def check_javadoc_params(javadoc_text: str, sig_params: list) -> tuple:
    """
    检查 JavaDoc 中 @param 的完整性。
    返回 (missing_params, empty_desc_params)
    """
    existing_params = set()
    empty_params = set()

    for m in re.finditer(r'@param\s+(\w+)\s*(.*?)(?:\n|$)', javadoc_text):
        name = m.group(1)
        desc = m.group(2).strip()
        existing_params.add(name)
        if not desc:
            empty_params.add(name)

    missing = [p for p in sig_params if p not in existing_params]
    empty_desc = [p for p in sig_params if p in empty_params]

    return missing, empty_desc


def check_javadoc_throws(javadoc_text: str, sig_throws: list) -> list:
    """检查 JavaDoc 中缺少的 @throws"""
    existing_throws = set()
    for m in re.finditer(r'@throws\s+(\w+)\s', javadoc_text):
        existing_throws.add(m.group(1))
    return [t for t in sig_throws if t not in existing_throws]


def analyze_method(lines: list, method_info: dict) -> MethodJavadocStatus:
    """综合分析一个方法的 JavaDoc 状态"""
    sig_params = extract_params_from_sig(method_info["signature"])
    return_type = extract_return_type(method_info["signature"])
    sig_throws = method_info["throws"]

    has_jd, jd_lines, jd_text = extract_existing_javadoc(lines, method_info["line_number"])

    status = MethodJavadocStatus(
        method_name=method_info["name"],
        signature_line=method_info["signature"].split("\n")[0].strip() if "\n" in method_info["signature"] else method_info["signature"].strip(),
        line_number=method_info["line_number"],
        has_javadoc=has_jd,
        javadoc_lines=jd_lines,
        throws_types=sig_throws,
    )

    if has_jd:
        missing_params, empty_desc_params = check_javadoc_params(jd_text, sig_params)
        status.missing_params = missing_params
        status.empty_desc_params = empty_desc_params

        has_ret, ret_empty = has_return_in_javadoc(jd_text)
        status.has_return = has_ret
        status.return_empty = ret_empty

        if return_type and not has_ret:
            status.missing_return = True
        elif return_type and ret_empty:
            status.return_empty = True

        status.has_throws = len(check_javadoc_throws(jd_text, sig_throws)) < len(sig_throws)
        status.missing_throws = check_javadoc_throws(jd_text, sig_throws)
    else:
        # 完全没有 JavaDoc
        status.missing_params = sig_params
        if return_type:
            status.missing_return = True
        status.missing_throws = sig_throws
        status.empty_desc_params = []

    # 判断是否完整
    status.is_complete = not status.needs_attention()

    return status


def analyze_file(file_path: str, root: Path) -> FileReport:
    """分析单个文件的 JavaDoc 覆盖情况"""
    raw_lines = read_file_lines(file_path)
    lines = [l.rstrip("\n").rstrip("\r") for l in raw_lines]

    class_name, is_interface, impl_interface = extract_class_name(lines)
    class_jd = has_class_javadoc(lines)
    methods = extract_methods(lines, is_interface, class_name)

    relative = str(Path(file_path).relative_to(root))

    report = FileReport(
        file_path=file_path,
        relative_path=relative,
        is_interface=is_interface,
        has_class_javadoc=class_jd,
        has_bom=has_bom(file_path),
        class_name=class_name or os.path.basename(file_path),
        interface_name=impl_interface,
    )

    for method_info in methods:
        report.methods.append(analyze_method(lines, method_info))

    return report


# ============================================================
# 输出格式化
# ============================================================

def print_summary(reports: list, include_details: bool = True):
    """打印汇总报告"""
    total_files = len(reports)
    total_methods = sum(len(r.methods) for r in reports)
    total_ok = sum(r.ok_count() for r in reports)
    total_need = sum(r.need_count() for r in reports)
    no_class_jd = sum(1 for r in reports if not r.has_class_javadoc)
    bom_files = [r for r in reports if r.has_bom]

    print("=" * 70)
    print("JavaDoc 覆盖扫描报告")
    print("=" * 70)
    print(f"  扫描文件数: {total_files}  (接口: {sum(1 for r in reports if r.is_interface)}, "
          f"实现类: {sum(1 for r in reports if not r.is_interface)})")
    print(f"  总方法数:   {total_methods}")
    print(f"  注释完整:   {total_ok}  ({total_ok * 100 // max(total_methods, 1)}%)")
    print(f"  需要补充:   {total_need}  ({total_need * 100 // max(total_methods, 1)}%)")
    print(f"  缺少类级注释: {no_class_jd} 个文件")
    if bom_files:
        print(f"  ⚠ BOM 文件:  {len(bom_files)} 个 (UTF-8 with BOM — 建议先移除 BOM)")
    print()

    if not include_details:
        return

    # 按文件明细
    print("-" * 70)
    print(f"{'文件':<50} {'方法':>5} {'完整':>5} {'需补':>5}")
    print("-" * 70)
    for r in reports:
        flag = " [I]" if r.is_interface else " [C]"
        cjd = "" if r.has_class_javadoc else " (缺类注释)"
        bom = " [BOM!]" if r.has_bom else ""
        print(f"{r.relative_path + flag + cjd + bom:<50} {len(r.methods):>5} {r.ok_count():>5} {r.need_count():>5}")

    # 需要补充的方法详情
    print()
    print("=" * 70)
    print("需要补充 JavaDoc 的方法详情")
    print("=" * 70)
    for r in reports:
        need = r.methods_needing_attention()
        if not need:
            continue
        print(f"\n[FILE] {r.relative_path}")
        if not r.has_class_javadoc:
            print(f"   [!] 缺少类级 JavaDoc")
        for m in need:
            issues = []
            if not m.has_javadoc:
                issues.append("无 JavaDoc")
            if m.missing_params:
                issues.append(f"缺 @param: {', '.join(m.missing_params)}")
            if m.empty_desc_params:
                issues.append(f"@param 描述为空: {', '.join(m.empty_desc_params)}")
            if m.missing_return:
                issues.append("缺 @return")
            if m.return_empty:
                issues.append("@return 描述为空")
            if m.missing_throws:
                issues.append(f"缺 @throws: {', '.join(m.missing_throws)}")
            print(f"   L{m.line_number:<4} {m.method_name}() — {'; '.join(issues)}")


def print_json(reports: list):
    """输出 JSON 格式"""
    output = []
    for r in reports:
        entry = {
            "file": r.relative_path,
            "isInterface": r.is_interface,
            "className": r.class_name,
            "interfaceName": r.interface_name,
            "hasClassJavadoc": r.has_class_javadoc,
            "hasBom": r.has_bom,
            "totalMethods": len(r.methods),
            "completeCount": r.ok_count(),
            "needAttentionCount": r.need_count(),
            "methods": [],
        }
        for m in r.methods_needing_attention():
            entry["methods"].append({
                "name": m.method_name,
                "line": m.line_number,
                "hasJavadoc": m.has_javadoc,
                "missingParams": m.missing_params,
                "emptyDescParams": m.empty_desc_params,
                "missingReturn": m.missing_return,
                "returnEmpty": m.return_empty,
                "missingThrows": m.missing_throws,
            })
        output.append(entry)
    print(json.dumps(output, ensure_ascii=False, indent=2))


def print_csv(reports: list):
    """输出 CSV 格式（适合导入 Excel）"""
    print("file,className,isInterface,hasClassJavadoc,methodName,line,hasJavadoc,missingParamsCount,"
          "emptyDescParamsCount,missingReturn,returnEmpty,missingThrowsCount")
    for r in reports:
        for m in r.methods_needing_attention():
            print(f'"{r.relative_path}","{r.class_name}",{r.is_interface},{r.has_class_javadoc},'
                  f'"{m.method_name}",{m.line_number},{m.has_javadoc},{len(m.missing_params)},'
                  f'{len(m.empty_desc_params)},{m.missing_return},{m.return_empty},{len(m.missing_throws)}')


def find_module_root(file_path: str) -> str:
    """从文件路径推断 Maven 模块根目录"""
    parts = Path(file_path).parts
    for i, part in enumerate(parts):
        if part == "src" and i > 0:
            return str(Path(*parts[:i]))
    return str(Path(file_path).parent)


# ============================================================
# 入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="扫描 Java Service 文件的 JavaDoc 覆盖情况")
    parser.add_argument("root", help="项目根目录")
    parser.add_argument("--module", "-m", help="指定 Maven 子模块 (如 component, app, api)")
    parser.add_argument("--files", "-f", nargs="+", help="指定 Java 文件路径")
    parser.add_argument("--pattern", "-p", nargs="+", help="自定义 glob 模式 (默认: **/*Service.java **/*ServiceImpl.java)")
    parser.add_argument("--json", "-j", action="store_true", help="输出 JSON 格式")
    parser.add_argument("--csv", action="store_true", help="输出 CSV 格式")
    parser.add_argument("--summary", "-s", action="store_true", help="仅输出汇总")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"错误: 目录不存在 — {root}", file=sys.stderr)
        sys.exit(1)

    files = find_java_files(root, args.module, args.files, args.pattern)
    if not files:
        print("未找到 Service 文件。", file=sys.stderr)
        sys.exit(0)

    reports = []
    parse_errors = 0
    for f in files:
        try:
            report = analyze_file(f, root)
            reports.append(report)
        except Exception as e:
            parse_errors += 1
            print(f"警告: 解析 {f} 失败 — {e}", file=sys.stderr)

    if args.json:
        print_json(reports)
    elif args.csv:
        print_csv(reports)
    else:
        print_summary(reports, include_details=not args.summary)

    if parse_errors:
        sys.exit(2)

    # 返回码: 缺少类级或方法级 JavaDoc 时非 0
    has_issues = any(r.needs_attention() for r in reports)
    sys.exit(0 if not has_issues else 1)


if __name__ == "__main__":
    main()
