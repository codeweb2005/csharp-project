import jwt from 'jsonwebtoken';

const token = jwt.sign({
  sub: '1',
  role: 'Admin'
}, 'VinhKhanhFoodTour2026SuperSecretJWTKey!@#$%^&*()', {
  expiresIn: '1h',
  issuer: 'VinhKhanhFoodTour',
  audience: 'VinhKhanhFoodTourAdmin'
});

const res = await fetch('http://localhost:8080/api/v1/analytics/visits-by-hour?date=2026-05-07&tzOffset=420', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const json = await res.json();
console.log(JSON.stringify(json, null, 2));
