# Auth Flow — Angular → React Migration

## Nguồn gốc (Angular pos_web)

### Đăng nhập
1. User nhập `DomainName` + `password` (UI hash password: `CryptoService.computeHash(password)` → `PasswordSalt`)
2. `POST https://api.posmobile.vn/api/v1/user-infos/login` — **không có Authorization header**
   - Body: `{ DomainName, PasswordSalt, ... }` (không gửi Password thô)
3. Response: `{ Success, Data: { SessionToken, ... } }`
4. `SessionToken` lưu vào **cookie** key `Authorization` (URI-encoded)
5. `DomainName` lưu vào `localStorage.activeDomainName` (multi-tenant)
6. Gọi `POST devices/update` để đăng ký FCM token
7. Load user info: `GET user-infos/me` → `{ User, SettingAdmob, Permissions, Shops }`
8. Redirect → `/dashboard` (có tiền tố `/:domainName` nếu multi-tenant)

### Token attachment
Mọi request gắn header: `Authorization: Bearer <SessionToken>` (đọc từ cookie)

### Token hết hạn / lỗi
- HTTP 401, 402, 403 → redirect về `/login`
- Error code 402 → truyền `errorData` state vào login page

### Đăng xuất
1. `GET user-infos/logout?token=<token>`
2. Xóa cookie `Authorization`
3. Xóa `localStorage.activeDomainName`
4. Xóa `localStorage.fcm_token`
5. Redirect → `/login`

### Social login
- Google: `GET user-infos/login-google?token=<id_token>`
- Facebook: `GET user-infos/login-facebook?token=<accessToken>`
- Sau đó chạy cùng flow `processLogin()` như đăng nhập thường

### Multi-tenant routing
- Sau login: tất cả URL có dạng `/:domainName/dashboard`, `/:domainName/actives`, ...
- Route table được duplicate dưới `/:domainName`
- `RouteService.withDomain(url)` prepend domain vào mọi navigate call

---

## Mục tiêu React (pos-web-v2)

### Token storage hiện tại
- Redux slice `user.auth.data.access_token` + `redux-persist` vào localStorage
- Header: `Authorization: Bearer <token>` qua `fetchBaseQuery`
- Refresh: 401 → `POST /user/refresh-token` → retry, nếu fail → `window.location.replace('/login')`

### Cần thêm khi migrate sang POS API
- [ ] Hash password phía client (MD5/SHA): `PasswordSalt = hash(password)`
- [ ] Login endpoint: `POST user-infos/login` (không phải `/api/v1/login`)
- [ ] Lưu `DomainName` từ response → localStorage hoặc Redux
- [ ] Multi-tenant URL prefix support
- [ ] FCM device registration sau login: `POST devices/update`
- [ ] Load user info sau login: `GET user-infos/me`
- [ ] Social login buttons (Google / Facebook)
- [ ] Force change password flow (nếu cần)
- [ ] Logout gọi `GET user-infos/logout?token=`
