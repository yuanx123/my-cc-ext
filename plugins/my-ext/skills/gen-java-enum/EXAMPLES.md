# gen-java-enum 示例

以下示例演示不同项目环境、不同业务场景下 `code ↔ msg` 枚举的生成结果。

包路径均为示例，实际生成时通过搜索动态确定。

---

## 示例 1：标准模板 — 订单状态枚举

**场景**：项目有 Lombok + Apache Commons Lang3，需要新建订单状态枚举。

**输入**：枚举名 `OrderStatusEnum`，枚举值 `PENDING("待处理")`、`PROCESSING("处理中")`、`COMPLETED("已完成")`、`CANCELLED("已取消")`

**生成代码**：

```java
package com.example.order.enums;

import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 订单状态枚举
 *
 * @since 2026-07-18
 */
@Getter
public enum OrderStatusEnum {

    CANCELLED("CANCELLED", "已取消"),
    COMPLETED("COMPLETED", "已完成"),
    PENDING("PENDING", "待处理"),
    PROCESSING("PROCESSING", "处理中"),
    ;

    private final String code;
    private final String msg;

    private static final Map<String, OrderStatusEnum> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(OrderStatusEnum::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(OrderStatusEnum::getMsg, OrderStatusEnum::getCode, (a, b) -> a));

    OrderStatusEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static OrderStatusEnum getByCode(String code) {
        if (StringUtils.isEmpty(code)) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (StringUtils.isEmpty(msg)) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        OrderStatusEnum e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
}
```

**要点**：
- 枚举值按 code 字典序排列：`CANCELLED → COMPLETED → PENDING → PROCESSING`
- `@since` 使用生成当天的日期
- `CODE_MAP` + `MSG_CODE_MAP` 类加载时一次性构建，后续 `getByCode` / `getCodeByMsg` / `getMsgByCode` 均为 O(1)
- Lombok `@Getter` 省去手写 getter

---

## 示例 2：无 Commons Lang3 — 支付方式枚举

**场景**：项目无 Apache Commons Lang3，需用 Java 原生判空。

**输入**：枚举名 `PaymentMethodEnum`，枚举值 `ALIPAY("支付宝")`、`WECHAT("微信支付")`、`BANK_CARD("银行卡")`

**生成代码**：

```java
package com.example.payment.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 支付方式枚举
 *
 * @since 2026-07-18
 */
@Getter
public enum PaymentMethodEnum {

    ALIPAY("ALIPAY", "支付宝"),
    BANK_CARD("BANK_CARD", "银行卡"),
    WECHAT("WECHAT", "微信支付"),
    ;

    private final String code;
    private final String msg;

    private static final Map<String, PaymentMethodEnum> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(PaymentMethodEnum::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(PaymentMethodEnum::getMsg, PaymentMethodEnum::getCode, (a, b) -> a));

    PaymentMethodEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static PaymentMethodEnum getByCode(String code) {
        if (code == null || code.isEmpty()) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (msg == null || msg.isEmpty()) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        PaymentMethodEnum e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
}
```

**与标准模板的差异**：
- 无 `import org.apache.commons.lang3.StringUtils`
- `StringUtils.isEmpty(x)` → `x == null || x.isEmpty()`
- 其余结构（`CODE_MAP`、`MSG_CODE_MAP`、三个静态方法）完全一致

---

## 示例 3：无 Lombok — 用户角色枚举

**场景**：项目无 Lombok 依赖，需手写 getter。

**输入**：枚举名 `UserRoleEnum`，枚举值 `ADMIN("管理员")`、`USER("普通用户")`、`VIEWER("只读用户")`

**生成代码**：

```java
package com.example.user.enums;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 用户角色枚举
 *
 * @since 2026-07-18
 */
public enum UserRoleEnum {

    ADMIN("ADMIN", "管理员"),
    USER("USER", "普通用户"),
    VIEWER("VIEWER", "只读用户"),
    ;

    private final String code;
    private final String msg;

    private static final Map<String, UserRoleEnum> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(UserRoleEnum::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(UserRoleEnum::getMsg, UserRoleEnum::getCode, (a, b) -> a));

    UserRoleEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public String getCode() {
        return code;
    }

    public String getMsg() {
        return msg;
    }

    public static UserRoleEnum getByCode(String code) {
        if (code == null || code.isEmpty()) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (msg == null || msg.isEmpty()) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        UserRoleEnum e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
}
```

**与标准模板的差异**：
- 无 `@Getter` 注解、无 Lombok import
- 手写 `getCode()` / `getMsg()` 方法
- 此示例还同时演示了无 Commons Lang3 的写法（Java 原生判空）

---

## 示例 4：补全已有枚举 — 为旧枚举添加 Map 缓存和双向查找

**场景**：旧枚举只有 code/msg 字段和构造器，缺少 `CODE_MAP`、`MSG_CODE_MAP` 和三个查找方法。

**已有代码**（片段）：

```java
@Getter
public enum SexEnum {

    MALE("MALE", "男"),
    FEMALE("FEMALE", "女"),
    ;

    private final String code;
    private final String msg;

    SexEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }
}
```

**补全后**：在 `}` 前插入两个 Map + 三个静态方法：

```java
    private static final Map<String, SexEnum> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(SexEnum::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(SexEnum::getMsg, SexEnum::getCode, (a, b) -> a));

    public static SexEnum getByCode(String code) {
        if (StringUtils.isEmpty(code)) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (StringUtils.isEmpty(msg)) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        SexEnum e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
```

同时补充缺失的 import（`org.apache.commons.lang3.StringUtils`、`java.util.Arrays`、`java.util.Map`、`java.util.function.Function`、`java.util.stream.Collectors`）。

---

## 示例 5：Hutool 项目 — 通知类型枚举

**场景**：项目使用 Hutool 而非 Commons Lang3（`pom.xml` 中有 `hutool-all` 依赖）。

**生成代码**：

```java
package com.example.notify.enums;

import cn.hutool.core.util.StrUtil;
import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 通知类型枚举
 *
 * @since 2026-07-18
 */
@Getter
public enum NotifyTypeEnum {

    EMAIL("EMAIL", "邮件"),
    SMS("SMS", "短信"),
    ;

    private final String code;
    private final String msg;

    private static final Map<String, NotifyTypeEnum> CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(NotifyTypeEnum::getCode, Function.identity()));

    private static final Map<String, String> MSG_CODE_MAP =
        Arrays.stream(values()).collect(Collectors.toMap(NotifyTypeEnum::getMsg, NotifyTypeEnum::getCode, (a, b) -> a));

    NotifyTypeEnum(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static NotifyTypeEnum getByCode(String code) {
        if (StrUtil.isEmpty(code)) return null;
        return CODE_MAP.get(code);
    }

    public static String getCodeByMsg(String msg) {
        if (StrUtil.isEmpty(msg)) return null;
        return MSG_CODE_MAP.get(msg);
    }

    public static String getMsgByCode(String code) {
        NotifyTypeEnum e = getByCode(code);
        return e != null ? e.getMsg() : null;
    }
}
```

**要点**：
- 发现项目已有 Hutool 依赖时，优先复用项目现有依赖
- `import cn.hutool.core.util.StrUtil` 替代 `org.apache.commons.lang3.StringUtils`

---

## 场景速查

| 场景 | Lombok | StringUtils | 参考示例 |
|------|--------|-------------|----------|
| 标准项目 | ✅ | Apache | 示例 1 |
| 无 Commons Lang3 | ✅ | Java 原生 | 示例 2 |
| 无 Lombok | ❌ | Java 原生 | 示例 3 |
| 补全旧枚举 | 保持现状 | 保持现状 | 示例 4 |
| Hutool 项目 | ✅ | Hutool | 示例 5 |
