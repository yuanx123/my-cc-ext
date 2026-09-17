# JavaDoc 示例

## 类级注释

```java
/**
 * 楼栋相关业务服务接口，提供楼栋权限校验、项目集群等功能。
 */
public interface BuildingService {
```

```java
/**
 * 楼栋业务服务实现，负责楼栋权限过滤和项目集群逻辑。
 */
@Service
public class BuildingServiceImpl implements BuildingService {
```

## 接口方法（完整注释）

```java
/**
 * 根据用户权限筛选可访问的楼栋编号
 *
 * @param inputBuildingNos 待筛选的楼栋编号列表
 * @return 用户有权限访问的楼栋编号列表
 */
List<String> authBuildingNo(List<String> inputBuildingNos);
```

## 带 throws 的方法

```java
/**
 * 用户登录认证，校验验证码并返回用户信息及登录凭证
 *
 * @param mobileNo 手机号码
 * @param code 短信验证码
 * @param httpSession HTTP 会话
 * @param httpResponse HTTP 响应
 * @return 用户信息及 Cookie 凭证
 * @throws BusinessException 当验证码错误、失效或用户不存在时抛出
 */
UserInfoResponse login(String mobileNo, String code, HttpSession httpSession,
                       HttpServletResponse httpResponse) throws BusinessException;
```

## 多参数方法

```java
/**
 * 发送邮件通知
 *
 * @param ccList 抄送人邮箱列表
 * @param addressList 收件人邮箱列表
 * @param subject 邮件主题
 * @param content 邮件正文（支持 HTML）
 * @return 邮件发送记录 ID，发送失败时返回空
 */
Optional<Long> sendMail(List<String> ccList, List<String> addressList,
                        String subject, String content);
```

## 实现类 {@inheritDoc} 用法

```java
// 接口已有完整注释时，实现类只需：
/** {@inheritDoc} */
@Override
public List<String> authBuildingNo(final List<String> inputBuildingNos) {
    // 实现
}
```

## 实现类独有方法（完整注释）

```java
/**
 * 校验短信验证码发送次数，防止恶意刷短信
 *
 * @param mobile 手机号
 * @param code 当前验证码
 * @throws BusinessException 当发送次数超限时抛出，锁定 60 分钟
 */
private void checkCode(String mobile, String code) {
```

## 不符合规范的写法（避免）

```java
// ❌ @param 无说明
/**
 * 发送邮件
 * @param ccList
 * @param addressList
 * @return
 */

// ❌ @return 为空
/**
 * 查询用户
 * @param um 用户 UM 编号
 * @return
 */

// ❌ 有 throws 但无 @throws
/**
 * 登录
 * @param request 请求
 * @return 用户信息
 */
UserInfoResponse login(LoginRequest request) throws BusinessException;
```
