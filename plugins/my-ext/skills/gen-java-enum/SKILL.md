---
name: gen-java-enum
description: 当需要新建枚举类时使用。自动适配当前项目包路径，禁止写死。
---

# Java code ↔ msg 枚举生成

## 适用场景

- 新建 `code ↔ msg` 形式的枚举类
- 为已有枚举补全 `getByCode` / `getCodeByMsg` / `getMsgByCode` 查找方法

## 前置探查

生成代码前，按以下顺序探查项目环境：

1. **包路径** ：搜索项目已有枚举类所在目录（如 `**/enums/**`），动态确定 `package`，禁止写死
2. **Lombok** — 检查 `pom.xml` / `build.gradle` 是否包含 Lombok 依赖，决定是否使用 `@Getter`
3. **StringUtils** — 检查项目是否已有字符串工具类依赖，优先级：Apache Commons Lang3 > Hutool > 无依赖
4. **代码格式** — 读取当前项目的 `AGENTS.md` 和平台专用规则，再检查同模块现有代码，确认行宽、链式调用、注解和格式习惯

## 模板

包路径按项目实际枚举目录动态确定，禁止写死。

### 标准模板（Lombok + Apache Commons Lang3）

```java
package <动态确定>;

import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * <描述>
 *
 * @since <yyyy-MM-dd>
 */
@Getter
public enum <EnumName> {

    <KEY>("code", "msg"),
    ;

    private final String code;
    private final String msg;

    private static final Map<String, <EnumName>> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(<EnumName>::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(<EnumName>::getMsg, <EnumName>::getCode, (a, b) -> a));

    <EnumName>(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static <EnumName> getByCode(String code) {
        if (StringUtils.isEmpty(code)) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (StringUtils.isEmpty(msg)) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        <EnumName> e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
}
```

### 无 Apache Commons Lang3 时的空安全写法

将以下两处空判断替换为 Java 原生判空：

```java
// getByCode / getMsgByCode
if (code == null || code.isEmpty()) return null;

// getCodeByMsg
if (msg == null || msg.isEmpty()) return null;
```

若项目有 Hutool，可用 `StrUtil.isEmpty(msg)`，但优先推荐 Java 原生写法以减少非必要依赖。

其余结构（`CODE_MAP`、`MSG_CODE_MAP`、三个静态方法）与标准模板一致。

### 无 Lombok 时的 getter 写法

去掉 `@Getter` 注解和对应 import，手写 getter：

```java
public String getCode() {
    return code;
}

public String getMsg() {
    return msg;
}
```

其余结构（`CODE_MAP`、`MSG_CODE_MAP`、`getByCode`、`getCodeByMsg`、`getMsgByCode`）与标准模板一致。

## 规则

1. 包路径通过搜索已有枚举动态确定，不写死
2. `getByCode` + `getCodeByMsg` + `getMsgByCode` 三个方法缺一不可
3. `CODE_MAP`（code → 枚举实例）+ `MSG_CODE_MAP`（msg → code）静态缓存，类加载时一次性构建，后续查找 O(1)
4. 空安全处理：null 或空字符串输入直接返回 `null`
5. 若项目有 Lombok 则用 `@Getter`，否则手写 getter 方法
6. 构造器显式写出，不用 `@AllArgsConstructor`
7. 枚举值按 code 字典序排列
8. `@since` 用当天日期（生成代码时的系统日期，格式 `yyyy-MM-dd`）
9. 无匹配时返回 `null`（不抛异常）
10. 代码格式遵循行宽 160、链式调用、注解等规范（见前置探查第 4 步）

## 示例

详见 [EXAMPLES.md](EXAMPLES.md)
