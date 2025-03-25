# syntax = docker/dockerfile:1

# Sử dụng Node.js LTS version
FROM node:20-slim

# Tạo thư mục làm việc
WORKDIR /app

# Cài đặt các package cần thiết
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies và concurrently
RUN npm install && \
    npm install -g concurrently

# Copy toàn bộ source code
COPY . .

# Expose port nếu cần
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]
