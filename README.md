

# 🛍️ EProject Phase 1 – Microservices E-Commerce Platform

Hệ thống thương mại điện tử được xây dựng theo **Microservices Architecture**, triển khai bằng **Docker**, sử dụng **RabbitMQ** cho giao tiếp giữa các service và **CI/CD tự động** với GitHub Actions.

---

## 📖 Tổng quan dự án

### Mục tiêu

* Xây dựng nền tảng e-commerce mô phỏng thực tế
* Các tính năng chính:

  * Đăng ký / đăng nhập người dùng
  * Quản lý sản phẩm (thêm, sửa, xóa, xem)
  * Tạo và quản lý đơn hàng
  * Xử lý order bất đồng bộ qua message queue

### Công nghệ sử dụng

* **Backend:** Node.js + Express.js
* **Database:** MongoDB
* **Message Queue:** RabbitMQ
* **Containerization:** Docker + Docker Compose
* **CI/CD:** GitHub Actions
* **API Testing:** Postman

---

## 🏗️ Kiến trúc hệ thống

```
        ┌─────────────┐
        │   Client    │ (Postman)
        └──────┬──────┘
               │ 
               ▼
        ┌──────────────┐
        │ API Gateway  │ Port 3003
        │ (Routing +   │
        │ Auth check)  │
        └─────┬────────┘
      ┌───────┼─────────┐
      ▼       ▼         ▼
┌───────────┐ ┌────────────┐ ┌───────────┐
│ Auth      │ │ Products   │ │ Order     │
│ Service   │ │ Service    │ │ Service   │
│ 3000      │ │ 3001       │ │ 3002      │
│ JWT auth  │ │ CRUD + MQ  │ │ Process   │
└────┬──────┘ └────┬──────┘ └────┬──────┘
     │            │ MQ: send order │ MQ: receive
     ▼            ▼                ▼
┌───────────┐ ┌────────────┐ ┌────────────┐
│ Users DB  │ │ Products DB│ │ Orders DB  │
│ 27017     │ │ 27017      │ │ 27017      │
└───────────┘ └────────────┘ └────────────┘
                  │
                  ▼
             ┌──────────┐
             │ RabbitMQ │
             │ 5672/15672 │
             └──────────┘
           ┌───────────────┐
           │ Order Queue   │ <- Product Service publish order
           │ Products Queue│ <- Order Service publish result
           └───────────────┘
```

---

### Luồng xử lý

1. **Client gửi request** đến API Gateway:

   * `/auth` → Auth Service
   * `/products` → Products Service
   * `/order` → Order Service
2. **Auth Service**:

   * Xử lý đăng ký/đăng nhập
   * Trả JWT token cho client
3. **Product Service**:

   * CRUD sản phẩm
   * Khi user mua hàng (`/product/buy`), publish message vào **Order Queue**
4. **Order Service**:

   * Consume message từ **Order Queue**
   * Tính toán giá trị đơn hàng, lưu vào **Orders DB**
   * Sau đó publish kết quả vào **Products Queue**
5. **Product Service**:

   * Consume message từ **Products Queue**
   * Trả thông tin hóa đơn cho client

---

### Thành phần service

| Service          | Port       | Chức năng                                  | DB / Queue            |
| ---------------- | ---------- | ------------------------------------------ | --------------------- |
| API Gateway      | 3003       | Entry point, routing requests              | -                     |
| Auth Service     | 3000       | Đăng ký, đăng nhập, tạo JWT                | Users DB              |
| Products Service | 3001       | CRUD sản phẩm, gửi/nhận message            | Products DB, RabbitMQ |
| Order Service    | 3002       | Xử lý đơn hàng, tính toán, publish kết quả | Orders DB, RabbitMQ   |
| MongoDB          | 27017      | Lưu dữ liệu users/products/orders          | -                     |
| RabbitMQ         | 5672/15672 | Message queue (orders/products)            | -                     |

---

### Flow mua hàng qua RabbitMQ

1. Client gọi `/products/buy` với danh sách product IDs
2. Product Service tạo **order message** → publish vào **Order Queue**
3. Order Service consume message, tạo order → lưu MongoDB → publish kết quả vào **Products Queue**
4. Product Service consume từ **Products Queue** → trả thông tin hóa đơn cho client

---

## 🚀 Hướng dẫn chạy dự án

### 🧰 Yêu cầu

* Docker Desktop
* Git
* Các cổng: 27017, 3000–3003, 5672, 15672 trống

### 🪜 Bước 1: Clone repository

```bash
git clone https://github.com/ManhPhuc204/eProject-Phase-1
cd EProject-Phase-1
```

### 🪜 Bước 2: Chạy các service bằng Docker Compose

```bash
docker-compose up -d
```

### 🪜 Bước 3: Kiểm tra trạng thái

```bash
docker ps
```

## 📡 Test API với Postman

### Lưu ý quan trọng
- **Tất cả requests đi qua API Gateway:** `http://localhost:3003`
- **Cần JWT token** cho các API: Products, Orders
- Test theo đúng thứ tự dưới đây


### TEST 1: Đăng ký tài khoản

**Nghiệp vụ:** Tạo tài khoản người dùng mới trong hệ thống

**Request:**
```
Method: POST
URL: http://localhost:3003/auth/register
Headers:
  Content-Type: application/json
Body (JSON):
{
  "username": "LeBuiManhPhuc",
  "password": "12345"
}
```

**Kết quả mong đợi:**
- Status: `200 OK`

<img width="948" height="1001" alt="image" src="https://github.com/user-attachments/assets/40139865-0f7b-430d-a541-c8d94e2b8c71" />


<img width="1336" height="729" alt="image" src="https://github.com/user-attachments/assets/7de62952-e343-4cf9-9cbb-ea0b60c76156" />



### TEST 2: Đăng nhập

**Nghiệp vụ:** Đăng nhập với tài khoản đã tạo để lấy JWT token

**Request:**
```
Method: POST
URL: http://localhost:3003/auth/login
Headers:
  Content-Type: application/json
Body (JSON):
{
  "username": "LeBuiManhPhuc",
  "password": "12345"
}
```

**Kết quả mong đợi:**
- Status: `200 OK`

**⚠️ Quan trọng:** Copy `token` để dùng cho các requests tiếp theo!

<img width="958" height="1018" alt="image" src="https://github.com/user-attachments/assets/859751ac-04fb-467d-a380-06988980e48c" />


### TEST 3: Tạo sản phẩm mới

**Nghiệp vụ:** Thêm sản phẩm vào hệ thống

**Request:**
```
Method: POST
URL: http://localhost:3003/products
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
Body (JSON):
{
  "name": "Smart Watch X15",
  "price": 150,
  "description": "Đồng hồ thông minh chất lượng cao"
}
```

**Kết quả mong đợi:**
- Status: `201 Created`

<img width="964" height="1015" alt="image" src="https://github.com/user-attachments/assets/c9325d9c-f82f-4cef-b814-b3ae176903e9" />




### TEST 4: Xem danh sách sản phẩm

**Nghiệp vụ:** Lấy tất cả sản phẩm trong hệ thống

**Request:**
```
Method: GET
URL: http://localhost:3003/products
Headers:
  Authorization: Bearer <TOKEN>
```

**Kết quả mong đợi:**
- Status: `200 OK`
<img width="961" height="1014" alt="image" src="https://github.com/user-attachments/assets/d3027969-1967-4dfe-988f-8dec7eb8c361" />

### TEST 5: Mua hàng qua RabbitMQ (API /buy)

**Nghiệp vụ:** Mua sản phẩm, hệ thống tự động tạo order qua RabbitMQ

**Request:**
```
Method: POST
URL: http://localhost:3003/products/buy
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
Body (JSON):
{
  "ids": ["68f4b96d2352aa320c2d0200"]
}
```

**Lưu ý:** Thay `ids` bằng array các `_id` sản phẩm từ TEST 5

**Kết quả mong đợi:**
- Status: `201 Created`

<img width="955" height="1013" alt="image" src="https://github.com/user-attachments/assets/b97b48d6-8e54-4cf8-a81c-2e2d3b7823a3" />


### TEST 6: Kiểm tra RabbitMQ

**Nghiệp vụ:** Xem message queue đã xử lý đơn hàng từ TEST 5

**Cách kiểm tra:**
1. Mở browser: http://localhost:15672
2. Login: `guest` / `guest`
3. Click tab **Queues**
4. Xem 2 queues:
   - `orders` - Nhận message từ Product service
   - `products` - Gửi kết quả về Product service
5. Click vào queue → Tab **Get messages** để xem nội dung

**Kết quả mong đợi:**
- Queues tồn tại và đã xử lý messages
<img width="624" height="334" alt="image" src="https://github.com/user-attachments/assets/849edeb6-e57a-4ee3-97ce-09634bc81ef1" />

- Trong **Overview** tab thấy biểu đồ message rate
<img width="624" height="281" alt="image" src="https://github.com/user-attachments/assets/af579380-0481-4bd7-b3d7-c1508976e70c" />

## ⚙️ CI/CD Pipeline

### Cấu hình với **GitHub Actions**

Workflow thực hiện các bước:

1. **Build & Test**:

   * Kiểm tra code
   * Chạy unit test (Mocha)
2. **Build Docker Images**:

   * Tạo image cho các services: Auth, Product, Order, Gateway
3. **Push Docker Images**:

   * Tự động đẩy lên Docker Hub sau khi build thành công
4. **Notify (Optional)**:

   * Gửi thông báo khi pipeline hoàn tất
  
## Github Action

<img width="624" height="273" alt="image" src="https://github.com/user-attachments/assets/f9d130dc-67cb-41cd-8119-cee28b0fa11c" />

### 🔹 File cấu hình:

`.github/workflows/ci-cd.yml`

---

## 🐳 Docker Hub Image

Các image được build và push tự động:

| Service      | Docker Image                                 |
| ------------ | -----------------------------------------    |
| Auth         | `dockerhub-manhphuc04/order`                 |
| Product      | `dockerhub-manhphuc04/product`               |
| Order        | `dockerhub-manhphuc04/order`                 |
| Api-Gateway  | `dockerhub-manhphuc04/api-gateway`           |

<img width="1892" height="800" alt="image" src="https://github.com/user-attachments/assets/ae11b839-6c0b-43c4-96ac-327008182924" />



## 📂 Cấu Trúc Thư Mục

```
EProject-Phase-1/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          
├── api-gateway/
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── auth/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── controllers/
│       ├── models/
│       ├── services/
│       └── test/
├── product/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── test/
├── order/
│   ├── Dockerfile
│   ├── index.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── models/
│       └── utils/
├── docker-compose.yml         
├── README.md                  
```



### 📝 Ghi chú

* Kiến trúc Microservices giúp dễ dàng mở rộng, bảo trì và deploy từng service độc lập
* RabbitMQ đảm bảo tính bất đồng bộ giữa Product Service và Order Service
* CI/CD tự động giúp tiết kiệm thời gian deploy, giảm lỗi thủ công


### 👨‍💻 Tác Giả

**Tên:** Lê Bùi Mạnh Phúc
**MSSV:** 22644731

**GitHub:** https://github.com/ManhPhuc204/eProject-Phase-1  

**Docker Hub:** https://hub.docker.com/repositories/manhphuc04


---
