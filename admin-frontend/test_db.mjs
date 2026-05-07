import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection('mysql://admin:admin123@vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com:3306/VinhKhanhFoodTour');
  const [rows] = await connection.execute('SELECT * FROM WebSiteVisits ORDER BY VisitedAt DESC LIMIT 10');
  console.log('WebSiteVisits:', rows);
  const [rows2] = await connection.execute('SELECT * FROM VisitHistory ORDER BY VisitedAt DESC LIMIT 10');
  console.log('VisitHistory:', rows2);
  await connection.end();
}
run();
