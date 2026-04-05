-- ============================================================================
-- 008_MockData.sql (MySQL)
-- Sinh ngẫu nhiên dữ liệu ảo (Mock Data) nhưng đậm chất thực tế cho Phố Ẩm Thực Vĩnh Khánh.
-- Hỗ trợ test giao diện Dashboard, Phân quyền Vendor và Danh sách POI.
-- ============================================================================

USE `VinhKhanhFoodTour`;

-- ============================================================================
-- 1. CHỦ QUÁN (Vendors) MỚI TƯƠNG ỨNG VỚI CÁC QUÁN CHUẨN BỊ THÊM
-- ============================================================================

INSERT IGNORE INTO `Users`
    (`Username`, `Email`, `PasswordHash`, `FullName`, `PhoneNumber`, `Role`, `PreferredLanguageId`, `IsActive`, `EmailConfirmed`)
VALUES
    ('octhao_owner', 'octhao@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Trần Thảo', '0901234567', 1, 1, 1, 1),
    ('ocvu_owner', 'ocvu@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Nguyễn Thái Vũ', '0902345678', 1, 1, 1, 1),
    ('chilli_owner', 'chilli@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'David Trần', '0903456789', 1, 1, 1, 1),
    ('otxiem_owner', 'otxiem@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Lê Khắc Xiêm', '0904567890', 1, 1, 1, 1),
    ('langquan_owner', 'langquan@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Phạm Quỳnh', '0905678901', 1, 1, 1, 1),
    ('sushiko_owner', 'sushiko@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Michiko Le', '0906789012', 1, 1, 1, 1),
    ('bunca_owner', 'bunca@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Lâm Văn Điền', '0907890123', 1, 1, 1, 1);

-- ============================================================================
-- 2. KHÁCH HÀNG (Customers) MỚI KHAI THÁC REVIEW VÀ LƯỢT NGHE
-- ============================================================================

INSERT IGNORE INTO `Users`
    (`Username`, `Email`, `PasswordHash`, `FullName`, `Role`, `PreferredLanguageId`, `IsActive`, `EmailConfirmed`)
VALUES
    ('alice_traveler', 'alice@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Alice Henderson', 0, 2, 1, 1),
    ('bob_walker', 'bob@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Bob Odenkirk', 0, 2, 1, 1),
    ('john_smith', 'john@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'John Smith', 0, 2, 1, 1),
    ('emma_watson', 'emma@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Emma Watson', 0, 2, 1, 1),
    ('michael_scott', 'michael@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Michael Scott', 0, 2, 1, 1),
    ('jessica_davis', 'jessica@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Jessica Davis', 0, 2, 1, 1),
    ('david_miller', 'david@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'David Miller', 0, 2, 1, 1),
    ('sarah_wilson', 'sarah@mock.com', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Sarah Wilson', 0, 2, 1, 1),
    ('nam_phong', 'namphong@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Hoàng Nam Phong', 0, 1, 1, 1),
    ('gia_han', 'giahan@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Vũ Gia Hân', 0, 1, 1, 1),
    ('tuan_anh', 'tuananh@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Phạm Tuấn Anh', 0, 1, 1, 1),
    ('hai_duong', 'haiduong@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Trần Hải Dương', 0, 1, 1, 1),
    ('quang_vinh', 'quangvinh@mock.vn', '$2a$12$LJ3EqPVBFVGkr1Hbt8h3ruYq10mlWzWT33kADmQ/sQ7MfCE0r.mYO', 'Lê Quang Vinh', 0, 1, 1, 1);

-- ============================================================================
-- 3. ĐIỂM ĂN UỐNG P2 (POIs) LẤY THEO DỮ LIỆU CÓ THẬT
-- (Id bắt đầu từ 11 do 1-10 đã được định nghĩa trong 005_SeedData.sql)
-- ============================================================================

-- Phân Loại tham khảo: (1: Quán ăn, 2: Hải sản & Ốc, 3: Quán nhậu, 4: Đồ uống, 5: Tráng miệng, 6: Lẩu, 7: Nướng)

INSERT IGNORE INTO `POIs`
    (`Id`, `VendorId`, `CategoryId`, `Latitude`, `Longitude`,
     `GeofenceRadiusMeters`, `Address`, `PhoneNumber`,
     `PriceRangeMin`, `PriceRangeMax`, `Rating`, `TotalVisits`, `IsActive`, `IsFeatured`)
VALUES
    (11, (SELECT Id FROM Users WHERE Username='octhao_owner'), 2, 10.7538500, 106.6932500, 25, '383 Vĩnh Khánh, P.8, Quận 4, TP.HCM', '0901234567', 40000, 180000, 4.60, 4200, 1, 1),
    (12, (SELECT Id FROM Users WHERE Username='ocvu_owner'), 2, 10.7540200, 106.6935200, 30, '37 Vĩnh Khánh, P.8, Quận 4, TP.HCM', '0902345678', 35000, 150000, 4.40, 3120, 1, 1),
    (13, (SELECT Id FROM Users WHERE Username='chilli_owner'), 6, 10.7531100, 106.6922100, 35, '232 Vĩnh Khánh, Quận 4, TP.HCM', '0903456789', 150000, 300000, 4.50, 5600, 1, 1),
    (14, (SELECT Id FROM Users WHERE Username='otxiem_owner'), 1, 10.7545000, 106.6942000, 25, '568 Vĩnh Khánh, P.10, Quận 4, TP.HCM', '0904567890', 50000, 250000, 4.70, 890, 1, 0),
    (15, (SELECT Id FROM Users WHERE Username='langquan_owner'), 7, 10.7543200, 106.6938900, 30, '531 Vĩnh Khánh, P.10, Quận 4, TP.HCM', '0905678901', 50000, 200000, 4.30, 2100, 1, 1),
    (16, (SELECT Id FROM Users WHERE Username='sushiko_owner'), 1, 10.7536700, 106.6929800, 20, '122 Vĩnh Khánh, P.10, Quận 4, TP.HCM', '0906789012', 30000, 150000, 4.80, 1800, 1, 0),
    (17, (SELECT Id FROM Users WHERE Username='bunca_owner'), 1, 10.7535400, 106.6925500, 20, '320/79 Vĩnh Khánh, Quận 4, TP.HCM', '0907890123', 35000, 55000, 4.40, 3400, 1, 0);

-- ============================================================================
-- 4. BẢN DỊCH NGÔN NGỮ POIs (VI & EN)
-- ============================================================================

INSERT IGNORE INTO `POITranslations`
    (`POIId`, `LanguageId`, `Name`, `ShortDescription`, `FullDescription`, `NarrationText`, `Highlights`)
VALUES
    -- 11. Ốc Thảo
    (11, 1, 'Ốc Thảo Vĩnh Khánh', 'Quán ốc lâu đời và siêu đông khách bậc nhất Phố Ẩm Thực.', 'Ốc Thảo là một trong những quán quen thuộc với khu vực Vĩnh Khánh nhờ hương vị ướp mặn mà rưới mỡ hành truyền thống. Không gian rộng nhưng thường xuyên kín bàn giờ cao điểm.', 'Bạn đang đến với Ốc Thảo. Ở đây không gian nhộn nhịp, các món ốc luôn tươi ngọt vị mặn của biển. Nên thử ốc hương nướng mỡ hành.', '["Ốc hương nướng","Ốc móng tay xào rau muống","Sò điệp phô mai"]'),
    (11, 2, 'Oc Thao Snail Restaurant', 'A legendary and extremely crowded snail joint on the Food Street.', 'Oc Thao is famous among District 4 locals for its savory sauces and traditional scallion oil toppings. The space is large but almost constantly full at peak hours.', 'You are arriving at Oc Thao. The bustling atmosphere is a testament to the fresh, sweet seafood. The grilled horn snails with scallion oil are highly recommended.', '["Grilled horn snails","Razor clams with morning glory","Cheese scallops"]'),
    
    -- 12. Ốc Vũ
    (12, 1, 'Ốc Vũ', 'Hệ thống quán ốc bình dân sở hữu liền kề nhiều chi nhánh trên đường Vĩnh Khánh.', 'Ốc Vũ là chuỗi ốc giá hấp dẫn thân thiện với học sinh, sinh viên nhưng chất lượng vẫn luôn được đảm bảo.', 'Ốc Vũ mang lại trải nghiệm ốc hè phố tuyệt vời với mức giá sinh viên. Sò lông nướng mỡ hành thơm phức đang vẫy gọi bạn.', '["Sò lông nướng mỡ hành","Mì xào ốc móng tay","Ốc bông rang muối"]'),
    (12, 2, 'Oc Vu Snail Chain', 'Affordable snail restaurant network dominating adjacent lots on Vinh Khanh street.', 'Very student-friendly budget but retains surprisingly solid quality control for its seafood freshness.', 'Oc Vu offers a phenomenal street food vibe at student prices. Scallion oil grilled hairy cockles are a must-try.', '["Grilled hairy cockles","Razor clam fried noodles","Salt roasted snails"]'),
    
    -- 13. Chilli Lẩu Nướng
    (13, 1, 'Chilli - Lẩu nướng tự chọn', 'Không gian lẩu nướng đa dạng cho tệp khách gia đình / team building.', 'Chilli cung cấp mô hình tiệc nướng tại bàn nhộn nhịp. Thực đơn bao quát mọi loại thịt tẩm ướp đậm đà và hải sản đa dạng.', 'Nếu bạn thèm đồ nướng, Chilli là điểm đến không thể bỏ lỡ. Thịt thăn bò tẩm sốt cay và lẩu thái là combo bất bại.', '["Thịt bò nướng cay","Lẩu Thái hải sản","Hàu nướng phô mai"]'),
    (13, 2, 'Chilli - BBQ & Hotpot', 'Vibrant BBQ & Hotpot space tailored for family gatherings and team building.', 'Offers interactive table-top grilling with heavily marinated meats and an extensive seafood selection.', 'Craving BBQ? Chilli is unmissable. The spicy marinated beef sirloin paired with Tom Yum hotpot is undefeated.', '["Spicy grilled beef","Tom Yum Seafood","Cheese baked oysters"]'),
    
    -- 14. Ớt Xiêm Quán
    (14, 1, 'Ớt Xiêm Quán', 'Bò lúc lắc, gỏi tôm thịt tươi ngon.', 'Quán chịu khó đầu tư decor đẹp mắt, không chỉ là nơi ăn nhậu mà còn check-in khá nghệ thuật.', 'Ớt Xiêm Quán - nơi thưởng thức bò lúc lắc mềm tan cùng gỏi nộm thanh mát giữa sự náo nhiệt của Vĩnh Khánh.', '["Bò lúc lắc","Gỏi tôm thịt","Mực chiên xù"]'),
    (14, 2, 'Ot Xiem Restaurant', 'Sizzling diced beef and fresh salad.', 'Nicely decorated interior, doubling as a visually appealing check-in spot alongside great culinary offerings.', 'Ot Xiem - savor melt-in-your-mouth shaking beef and refreshing salads amidst the chaos of Vinh Khanh.', '["Shaking Beef (Bo Luc Lac)","Shrimp pork salad","Fried calamari"]'),
    
    -- 15. Lãng Quán
    (15, 1, 'Lãng Quán', 'Quán nướng không khói quen thuộc của dân chơi hệ đêm.', 'Lãng Quán đa dạng các món lai rai như vú heo nướng, ba chỉ nướng kim châm.', 'Lãng Quán, hãy thả hồn theo khói thịt nướng nghi ngút thơm lừng và nâng ly cùng bạn hiền.', '["Vú heo nướng tảng","Ba chỉ cuộn nấm","Bạch tuộc nướng sa tế"]'),
    (15, 2, 'Lang Quan BBQ', 'Familiar smokeless BBQ spot for the late-night crowd.', 'Features diverse grazing items like grilled pork udder and enoki-stuffed pork belly.', 'Lang Quan - let yourself drift in the aromatic smoke of grilled meats and raise a glass with friends.', '["Grilled pork udder","Pork belly enoki roll","Satay octopus"]'),
    
    -- 16. Sushi KO
    (16, 1, 'Sushi KO', 'Ẩm thực Nhật Bản ngay giữa phố ốc bình dân.', 'Sashimi và sushi giá vỉa hè nhưng chất lượng nhà hàng. Cứu rỗi vị giác nếu bạn ngán đồ nướng.', 'Ai bảo Vĩnh Khánh chỉ có ốc? Sushi KO mang tinh hoa Nhật Bản đến với giá cực kì bình dân ngay phố ẩm thực Sài Gòn.', '["Sashimi cá hồi","Cuộn tôm tempura","Bạch tuộc mù tạt"]'),
    (16, 2, 'Sushi KO', 'Japanese cuisine right in the heart of a budget snail street.', 'Street priced sashimi and sushi with restaurant-tier quality. A palate cleanser if you are tired of BBQ.', 'Who said Vinh Khanh only has snails? Sushi KO brings affordable Japanese essence right to Saigon street food.', '["Salmon Sashimi","Shrimp Tempura Roll","Wasabi Octopus"]'),

    -- 17. Bún cá Châu Đốc
    (17, 1, 'Bún cá Châu Đốc', 'Đổi vị với tinh hoa ẩm thực miền Tây sông nước.', 'Nước dùng ngải bún vàng ươm thơm lừng, cá lóc đồng ngọt thịt, ăn kèm bông điên điển (theo mùa).', 'Chút hương đồng gió nội miền Tây ngay giữa Sài Gòn. Bạn phải thử bún cá lóc đồng nước dùng ngải bún đậm đà.', '["Bún cá lóc đồng","Gỏi cá lóc bông điên điển","Chả cá thác lác"]'),
    (17, 2, 'Chau Doc Fish Noodle', 'Switch up your palate with the essence of Mekong Delta cuisine.', 'Golden broth from wild turmeric and sweet snakehead fish, served with seasonal river hemp flowers.', 'A touch of the Mekong rustic countryside right in Saigon. You must try the robust turmeric snakehead fish noodle soup.', '["Snakehead fish noodle","River hemp flower salad","Fried bronze featherback fishcake"]');


-- ============================================================================
-- 5. POIMedia - HÌNH ẢNH MINH HOẠ THEO PLACEHOLDER 
-- Cho phép Frontend render ra Grid Ảnh Tuyệt Đẹp
-- ============================================================================

INSERT IGNORE INTO `POIMedia`
    (`POIId`, `MediaType`, `FileUrl`, `FileName`, `FileSize`, `MimeType`, `Width`, `Height`, `SortOrder`, `IsPrimary`)
VALUES
    (1, 0, 'https://placehold.co/800x600/C85A17/FFF?text=Oc+Dao+Front', 'oc-dao-front.jpg', 154000, 'image/jpeg', 800, 600, 1, 1),
    (1, 0, 'https://placehold.co/600x400/FF8C00/FFF?text=Oc+Dao+Food', 'oc-dao-food.jpg', 114000, 'image/jpeg', 600, 400, 2, 0),
    (2, 0, 'https://placehold.co/800x600/2E8B57/FFF?text=Oc+Ba+Hien', 'oc-ba-hien-main.jpg', 184000, 'image/jpeg', 800, 600, 1, 1),
    (3, 0, 'https://placehold.co/800x600/B22222/FFF?text=Long+Uong+40', 'long-uong-main.jpg', 144000, 'image/jpeg', 800, 600, 1, 1),
    (4, 0, 'https://placehold.co/800x600/8B0000/FFF?text=Oc+Oanh', 'oc-oanh-main.jpg', 124000, 'image/jpeg', 800, 600, 1, 1),
    (5, 0, 'https://placehold.co/800x600/4169E1/FFF?text=Hai+San+Nam+Sao', 'namsao-main.jpg', 174000, 'image/jpeg', 800, 600, 1, 1),
    (6, 0, 'https://placehold.co/800x600/FFD700/000?text=Bun+Rieu+Co+Ba', 'bun-rieu-main.jpg', 127000, 'image/jpeg', 800, 600, 1, 1),
    (7, 0, 'https://placehold.co/800x600/8B4513/FFF?text=Lau+De', 'lau-de-main.jpg', 137000, 'image/jpeg', 800, 600, 1, 1),
    (8, 0, 'https://placehold.co/800x600/A52A2A/FFF?text=Nuong+Ngoi', 'nuong-ngoi-main.jpg', 167000, 'image/jpeg', 800, 600, 1, 1),
    (9, 0, 'https://placehold.co/800x600/DDA0DD/FFF?text=Che+Ba+Tu', 'che-batu-main.jpg', 157000, 'image/jpeg', 800, 600, 1, 1),
    (10, 0, 'https://placehold.co/800x600/00CED1/FFF?text=Tra+Sua+Vinh+Khanh', 'tra-sua-main.jpg', 147000, 'image/jpeg', 800, 600, 1, 1),
    (11, 0, 'https://placehold.co/800x600/008080/FFF?text=Oc+Thao', 'oc-thao-ext.jpg', 189000, 'image/jpeg', 800, 600, 1, 1),
    (11, 0, 'https://placehold.co/600x400/20B2AA/FFF?text=Oc+Thao+Snails', 'oc-thao-snails.jpg', 89000, 'image/jpeg', 600, 400, 2, 0),
    (12, 0, 'https://placehold.co/800x600/4682B4/FFF?text=Oc+Vu', 'oc-vu-front.jpg', 169000, 'image/jpeg', 800, 600, 1, 1),
    (13, 0, 'https://placehold.co/800x600/DC143C/FFF?text=Chilli+BBQ', 'chilli-bbq.jpg', 219000, 'image/jpeg', 800, 600, 1, 1),
    (13, 0, 'https://placehold.co/600x400/FF6347/FFF?text=Spicy+Beef', 'chilli-beef.jpg', 119000, 'image/jpeg', 600, 400, 2, 0),
    (14, 0, 'https://placehold.co/800x600/32CD32/FFF?text=Ot+Xiem+Quan', 'otxiem-front.jpg', 199000, 'image/jpeg', 800, 600, 1, 1),
    (15, 0, 'https://placehold.co/800x600/800000/FFF?text=Lang+Quan', 'langquan-main.jpg', 149000, 'image/jpeg', 800, 600, 1, 1),
    (16, 0, 'https://placehold.co/800x600/1E90FF/FFF?text=Sushi+KO', 'sushiko-sashimi.jpg', 179000, 'image/jpeg', 800, 600, 1, 1),
    (17, 0, 'https://placehold.co/800x600/FFD700/000?text=Bun+Ca+Chau+Doc', 'bun-ca-hot.jpg', 159000, 'image/jpeg', 800, 600, 1, 1);

-- ============================================================================
-- 6. MENU & BẢN DỊCH MENU CHI TIẾT
-- ============================================================================

INSERT IGNORE INTO `POIMenuItems` (`Id`, `POIId`, `Price`, `IsAvailable`, `IsSignature`, `SortOrder`, `ImageUrl`) VALUES
    (11, 11, 80000, 1, 1, 1, 'https://placehold.co/200x200/CCC/000?text=Food'),
    (12, 11, 70000, 1, 1, 2, 'https://placehold.co/200x200/CCC/000?text=Food'),
    (13, 11, 120000, 1, 0, 3, 'https://placehold.co/200x200/CCC/000?text=Food'),
    (14, 12, 35000, 1, 1, 1, NULL),
    (15, 12, 50000, 1, 0, 2, NULL),
    (16, 13, 145000, 1, 1, 1, 'https://placehold.co/200x200/F00/FFF?text=Beef'),
    (17, 13, 189000, 1, 1, 2, 'https://placehold.co/200x200/FA8/FFF?text=Hotpot'),
    (18, 13, 220000, 1, 0, 3, NULL),
    (19, 16, 85000, 1, 1, 1, 'https://placehold.co/200x200/008/FFF?text=Salmon'),
    (20, 16, 45000, 1, 0, 2, NULL),
    (21, 17, 45000, 1, 1, 1, 'https://placehold.co/200x200/FD0/000?text=Noodle'),
    (22, 17, 10000, 1, 0, 2, NULL);

INSERT IGNORE INTO `MenuItemTranslations` (`MenuItemId`, `LanguageId`, `Name`, `Description`) VALUES
    -- Ốc Thảo (11, 12, 13)
    (11, 1, 'Ốc móng tay xào rau muống', 'Đậm vị miền Nam với mỡ hành tóp mỡ.'),
    (11, 2, 'Razor clams with morning glory', 'Rich southern flavor with pork rinds.'),
    (12, 1, 'Nghêu hấp thái', 'Sốt chua cay rất thích hợp húp nướng lèo.'),
    (12, 2, 'Thai style steamed clams', 'Spicy and sour broth.'),
    (13, 1, 'Cua rang muối ớt', 'Cua Cà Mau gạch đầy ấp, rim muối ớt siêu cay.'),
    (13, 2, 'Chili salt roasted crab', 'Crab full of roe, extremely spicy.'),
    
    -- Ốc Vũ (14, 15)
    (14, 1, 'Sò lông nướng mỡ hành', 'Rẻ mà ngon, hạt tiêu rang tay cực đỉnh.'),
    (14, 2, 'Scallion oil grilled hairy cockles', 'Cheap and delicious, topped with ground pepper.'),
    (15, 1, 'Ốc cà na xào tỏi', 'Cà na dai giòn sừn sựt.'),
    (15, 2, 'Garlic sauteed Ca Na snails', 'Chewy and crunchy snails.'),
    
    -- Chilli Lẩu Nướng (16, 17, 18)
    (16, 1, 'Lõi thăn vai bò sốt Hàn', 'Cắt lát mỏng, vân mỡ chóp đỉnh.'),
    (16, 2, 'Korean sauce beef sirloin', 'Thinly sliced, excellent marbling.'),
    (17, 1, 'Combo Lẩu Thái Hải Sản VIP', 'Gồm tôm càng, mực ống, bao tử hầm.'),
    (17, 2, 'VIP Thai Seafood Hotpot Combo', 'Includes mantis shrimp, squids, and stewed tripe.'),
    (18, 1, 'Bạch tuộc khổng lồ sa tế', 'Nguyên càng bạch tuộc tẩm ướp cay xé lưỡi.'),
    (18, 2, 'Giant Satay Octopus', 'Whole tentacles heavily marinated in spicy sauce.'),
    
    -- Sushi KO (19, 20)
    (19, 1, 'Sashimi Cá Hồi Nauy', 'Tươi sống, béo ngậy 5 miếng.'),
    (19, 2, 'Norwegian Salmon Sashimi', 'Fresh and fatty, 5 slices.'),
    (20, 1, 'Cơm cuộn tôm Tempura', 'Giòn tan trong miệng.'),
    (20, 2, 'Tempura Shrimp Roll', 'Melt in your mouth crunchiness.'),
    
    -- Bún cá (21, 22)
    (21, 1, 'Bún cá lóc đồng tô đặc biệt', 'Cá lóc đồng luộc và cá lóc chiên, ăn kèm chả.'),
    (21, 2, 'Special Snakehead Fish Noodle Soup', 'Boiled and fried wildcard snakehead, served with fishcake.'),
    (22, 1, 'Đầu cá lóc thêm', 'Đầu cá ngậy béo.'),
    (22, 2, 'Extra fish head', 'Fatty and extremely tasty head portion.');


-- ============================================================================
-- 7. LỊCH SỬ GHÉ THĂM (VisitHistory)
-- Để test Admin Dashboard Chart (số liệu Booking, Interaction ngẫu nhiên).
-- ============================================================================

-- Phân phát 50 lượt ghé thăm ngẫu nhiên ở 30 ngày qua (TriggerType: 0=Geofence, 1=Exit, 2=Manual, 3=List)
-- Vì MySQL không có FOR loop ngoài thủ tục, ta insert hàng loạt tĩnh nhưng phân bổ thời gian dùng hàm DATE_SUB()

INSERT IGNORE INTO `VisitHistory` (`UserId`, `POIId`, `VisitedAt`, `TriggerType`, `NarrationPlayed`, `DurationListened`, `IsSynced`) VALUES
-- 10 ngày gần nhất
((SELECT Id FROM Users WHERE Username='alice_traveler'), 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), 0, 1, 45, 1),
((SELECT Id FROM Users WHERE Username='bob_walker'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), 2, 1, 30, 1),
((SELECT Id FROM Users WHERE Username='emma_watson'), 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), 0, 1, 15, 1),
((SELECT Id FROM Users WHERE Username='nam_phong'), 16, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), 2, 1, 25, 1),
((SELECT Id FROM Users WHERE Username='tuan_anh'), 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 3, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='gia_han'), 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 0, 1, 10, 1),
((SELECT Id FROM Users WHERE Username='michael_scott'), 16, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY), 0, 1, 60, 1),
((SELECT Id FROM Users WHERE Username='david_miller'), 7, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY), 0, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='sarah_wilson'), 9, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), 2, 1, 35, 1),
((SELECT Id FROM Users WHERE Username='quang_vinh'), 17, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), 0, 1, 40, 1),
((SELECT Id FROM Users WHERE Username='alice_traveler'), 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), 0, 1, 20, 1),
((SELECT Id FROM Users WHERE Username='john_smith'), 15, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), 3, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='jessica_davis'), 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY), 0, 1, 12, 1),
((SELECT Id FROM Users WHERE Username='bob_walker'), 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY), 0, 1, 50, 1),
((SELECT Id FROM Users WHERE Username='nam_phong'), 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY), 2, 1, 36, 1),
((SELECT Id FROM Users WHERE Username='hai_duong'), 12, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY), 0, 1, 18, 1),
((SELECT Id FROM Users WHERE Username='hai_duong'), 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY), 0, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='tuan_anh'), 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY), 2, 1, 22, 1),
((SELECT Id FROM Users WHERE Username='quang_vinh'), 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY), 0, 1, 11, 1),

-- 11 - 20 ngày trước
((SELECT Id FROM Users WHERE Username='gia_han'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 DAY), 2, 1, 30, 1),
((SELECT Id FROM Users WHERE Username='david_miller'), 16, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY), 0, 1, 15, 1),
((SELECT Id FROM Users WHERE Username='sarah_wilson'), 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY), 0, 1, 40, 1),
((SELECT Id FROM Users WHERE Username='emma_watson'), 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY), 3, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='michael_scott'), 17, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY), 0, 1, 18, 1),
((SELECT Id FROM Users WHERE Username='alice_traveler'), 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 DAY), 0, 1, 25, 1),
((SELECT Id FROM Users WHERE Username='bob_walker'), 6, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 DAY), 2, 1, 36, 1),
((SELECT Id FROM Users WHERE Username='jessica_davis'), 12, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY), 0, 1, 45, 1),
((SELECT Id FROM Users WHERE Username='john_smith'), 15, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 DAY), 0, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='nam_phong'), 7, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY), 2, 1, 22, 1),

-- 21 - 30 ngày trước
((SELECT Id FROM Users WHERE Username='tuan_anh'), 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 21 DAY), 0, 1, 11, 1),
((SELECT Id FROM Users WHERE Username='hai_duong'), 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 DAY), 0, 1, 60, 1),
((SELECT Id FROM Users WHERE Username='quang_vinh'), 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 23 DAY), 3, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='gia_han'), 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY), 0, 1, 16, 1),
((SELECT Id FROM Users WHERE Username='alice_traveler'), 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 DAY), 2, 1, 24, 1),
((SELECT Id FROM Users WHERE Username='emma_watson'), 9, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 DAY), 0, 1, 33, 1),
((SELECT Id FROM Users WHERE Username='nam_phong'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 27 DAY), 0, 1, 44, 1),
((SELECT Id FROM Users WHERE Username='bob_walker'), 16, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY), 3, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='michael_scott'), 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 29 DAY), 0, 1, 55, 1),
((SELECT Id FROM Users WHERE Username='david_miller'), 17, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY), 2, 1, 28, 1),

-- Thêm bộ fake VisitHistory cường độ cao (để chart có peak) vào 3 ngày trước.
((SELECT Id FROM Users WHERE Username='nam_phong'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 0, 1, 40, 1),
((SELECT Id FROM Users WHERE Username='gia_han'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 0, 1, 35, 1),
((SELECT Id FROM Users WHERE Username='tuan_anh'), 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 0, 0, 0, 1),
((SELECT Id FROM Users WHERE Username='hai_duong'), 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 0, 1, 20, 1),
((SELECT Id FROM Users WHERE Username='quang_vinh'), 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), 2, 1, 25, 1);


SELECT '✅ 008_MockData.sql ĐÃ ĐƯỢC CHẠY THÀNH CÔNG!' AS Status;
-- ============================================================================
-- END DỮ LIỆU ẢO
-- ============================================================================
