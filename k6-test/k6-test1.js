import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '25s',
};

export default function () {
  const res = http.get('https://se-internship-data-stream-test.vercel.app/pages/login.html');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}