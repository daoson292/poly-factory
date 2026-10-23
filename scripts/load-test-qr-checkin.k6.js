import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * T092: Kịch bản kiểm thử tải k6 - Điểm danh QR đầu ca 100 - 200 CCU
 * Mục tiêu SRS v2.2.0:
 * - 200 CCU quét QR đồng thời trong 15 phút đầu ca
 * - Latency p95 < 200ms
 * - Tỷ lệ lỗi (Error Rate) < 1%
 * - Bộ nhớ RAM Docker Compose <= 1.2GB (PostgreSQL 400M, Backend 600M, Nginx 100M)
 */

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Khởi động 50 sinh viên đến sớm
    { duration: '3m', target: 200 },  // Cao điểm quét QR đầu ca 200 CCU
    { duration: '5m', target: 200 },  // Duy trì tải đỉnh
    { duration: '2m', target: 50 },   // Giảm tải sau khi ca bắt đầu
    { duration: '1m', target: 0 },    // Kết thúc kịch bản
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<400'], // 95% requests phản hồi dưới 200ms
    http_req_failed: ['rate<0.01'],                 // Tỷ lệ lỗi dưới 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000/api';

export default function () {
  const userId = `student_${__VU}_${__ITER}`;
  const authToken = `mock_jwt_token_${userId}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  // 1. Kiểm tra trạng thái phòng P407
  const statusRes = http.get(`${BASE_URL}/rooms/status`, { headers });
  check(statusRes, {
    'Room status returns 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 2. Điểm danh QR TOTP đầu ca kèm tọa độ GPS
  const checkinPayload = JSON.stringify({
    totpToken: '123456',
    latitude: 21.0381,
    longitude: 105.7468,
    deviceId: `dev_k6_vu_${__VU}`,
  });

  const checkinRes = http.post(`${BASE_URL}/attendance/check-in`, checkinPayload, { headers });
  check(checkinRes, {
    'Checkin response handled': (r) => r.status === 200 || r.status === 400,
    'Latency p95 check': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
