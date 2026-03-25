import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import { Activity, Users, Star, BarChart, MapPin, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [topPOIs, setTopPOIs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, poisRes, activityRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getTopPOIs(5),
          dashboardApi.getRecentActivity(5)
        ]);

        setStats(statsRes.data?.data || statsRes.data);
        setTopPOIs(poisRes.data?.data || poisRes.data || []);
        setRecentActivity(activityRes.data?.data || activityRes.data || []);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu Dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = [
    { title: 'Total POIs', icon: Star, color: 'text-purple-500', bg: 'bg-purple-100', value: stats?.totalPOIs || stats?.pois || 0 },
    { title: 'Total Visits', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', value: stats?.totalVisits || stats?.visits || 0 },
    { title: 'Active Tags/Users', icon: Activity, color: 'text-green-500', bg: 'bg-green-100', value: stats?.activeUsers || stats?.users || 0 },
    { title: 'Audio Plays', icon: BarChart, color: 'text-orange-500', bg: 'bg-orange-100', value: stats?.totalAudioPlays || stats?.audioPlays || 0 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Overview Dashboard</h1>
      
      {/* 4 Cards (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-full ${card.bg} ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {loading ? <span className="animate-pulse bg-gray-200 text-transparent rounded">0000</span> : card.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns layout for Top POIs and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 POIs */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Top Địa Điểm Nổi Bật</h2>
            <MapPin className="text-indigo-500 w-5 h-5" />
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</p>
            ) : topPOIs.length > 0 ? (
              topPOIs.map((poi, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition">
                  <span className="font-medium text-gray-700">{poi.name || poi.title}</span>
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full text-xs">
                    {poi.visitCount || poi.visits || 0} lượt đến
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Chưa có dữ liệu địa điểm.</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Hoạt Động Gần Đây</h2>
            <Clock className="text-purple-500 w-5 h-5" />
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</p>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((act, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-400 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-700 text-sm font-medium">{act.description || act.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(act.timestamp || act.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Chưa có hoạt động nào được ghi nhận.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
