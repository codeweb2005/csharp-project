using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using VinhKhanh.Infrastructure.Data;

var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseMySql("Server=vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com;Port=3306;Database=VinhKhanhFoodTour;Uid=admin;Pwd=admin123;CharSet=utf8mb4;", ServerVersion.AutoDetect("Server=vinhkhanh.cxau0au24i3b.ap-southeast-1.rds.amazonaws.com;Port=3306;Database=VinhKhanhFoodTour;Uid=admin;Pwd=admin123;CharSet=utf8mb4;"))
    .Options;

using var db = new AppDbContext(options);

var date = new DateTime(2026, 5, 7);
int tzOffsetMinutes = 420;

var localMidnightUtc = date.Date.AddMinutes(-tzOffsetMinutes);
var localEndOfDayUtc = localMidnightUtc.AddDays(1);

Console.WriteLine($"localMidnightUtc: {localMidnightUtc}");
Console.WriteLine($"localEndOfDayUtc: {localEndOfDayUtc}");

var q = db.VisitHistory
    .Where(v => v.VisitedAt >= localMidnightUtc && v.VisitedAt < localEndOfDayUtc);

var poiDates = q.Select(v => v.VisitedAt).ToList();

Console.WriteLine($"Found {poiDates.Count} POI visits.");
foreach(var d in poiDates)
{
    Console.WriteLine($"- {d} -> local hour: {d.AddMinutes(tzOffsetMinutes).Hour}");
}

var webDates = db.WebSiteVisits
    .Where(v => v.VisitedAt >= localMidnightUtc && v.VisitedAt < localEndOfDayUtc)
    .Select(v => v.VisitedAt)
    .ToList();

Console.WriteLine($"Found {webDates.Count} Web visits.");
foreach(var d in webDates)
{
    Console.WriteLine($"- {d} -> local hour: {d.AddMinutes(tzOffsetMinutes).Hour}");
}
