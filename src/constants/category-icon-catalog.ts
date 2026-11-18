export const CATEGORY_ICON_SECTIONS = [
  {
    id: 'foodAndDrink',
    title: { en: "Food and drinks", fi: "Ruoka ja juomat", ru: "Еда и напитки", fr: "Alimentation et boissons", es: "Comida y bebida" , vi: "Đồ ăn và thức uống" },
    icons: [
      {
        key: 'burger',
        label: { en: "Burger", fi: "Hampurilainen", ru: "Бургер", fr: "Hamburger", es: "Hamburguesa" , vi: "Bánh hamburger" },
        path: 'M3 10a9 6 0 0 1 18 0Z M3 14h18 M3 17h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z M9 7h.1 M14 6h.1',
      },
      {
        key: 'pizzaSlice',
        label: { en: "Pizza slice", fi: "Pizzapala", ru: "Пицца", fr: "Part de pizza", es: "Porción de pizza" , vi: "Miếng pizza" },
        path: 'M4 5q8-5 16 0l-8 16Z M6 9q6-4 12 0 M10 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M13 9h.1 M13 15h.1',
      },
      {
        key: 'lemonade',
        label: { en: "Lemonade", fi: "Limonaati", ru: "Лимонад", fr: "Limonade", es: "Limonada" , vi: "Nước chanh" },
        path: 'M5 7h14l-2 14H7Z M4 7h16 M12 7l2-5h4 M7 11h10 M9 15h.1 M14 14h.1 M12 18h.1',
      },
      {
        key: 'wineGlass',
        label: { en: "Wine glass", fi: "Viinilasi", ru: "Вино", fr: "Verre de vin", es: "Copa de vino" , vi: "Ly rượu vang" },
        path: 'M7 3h10l1 6a6 6 0 0 1-12 0Z M6.5 9h11 M12 15v6 M8 21h8',
      },
      {
        key: 'ramen',
        label: { en: "Ramen", fi: "Ramen", ru: "Рамен", fr: "Ramen", es: "Ramen" , vi: "Mì ramen" },
        path: 'M2 12h20q-1 8-10 8T2 12Z M8 20v2h8v-2 M14 12l7-8 M17 12l5-5',
      },
      {
        key: 'apple',
        label: { en: "Apple", fi: "Omena", ru: "Яблоко", fr: "Pomme", es: "Manzana" , vi: "Táo" },
        path: 'M12 7c-6-4-11 2-8 9 2 5 4 7 8 5 4 2 6 0 8-5 3-7-2-13-8-9Z M12 7q0-4 4-5 M12 6q-5 0-5-4 4 0 5 4',
      },
      {
        key: 'teaCup',
        label: { en: "Cup of tea", fi: "Teekuppi", ru: "Чашка чая", fr: "Tasse de thé", es: "Taza de té" , vi: "Tách trà" },
        path: 'M3 10h14v3a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6Z M17 11h2a2 2 0 1 1 0 4h-2 M2 21h17 M7 7q2-2 0-4 M12 7q2-2 0-4',
      },
      {
        key: 'grapes',
        label: { en: "Grapes", fi: "Viinirypäleet", ru: "Виноград", fr: "Raisins", es: "Uvas" , vi: "Nho" },
        path: 'M12 5q1-4 5-3 M10 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M16 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M7 11a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M13 12a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M10 18a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
      },
      {
        key: 'cheeseWedge',
        label: { en: "Cheese", fi: "Juusto", ru: "Сыр", fr: "Fromage", es: "Queso" , vi: "Phô mai" },
        path: 'M2 11l13-7 7 7v9H2Z M2 11h20 M7 14h.1 M12 17h.1 M17 14h.1 M12 8h.1',
      },
    ],
  },
  {
    id: 'transport',
    title: { en: "Transport", fi: "Liikenne", ru: "Транспорт", fr: "Transports", es: "Transporte" , vi: "Đi lại" },
    icons: [
      {
        key: 'scooter',
        label: { en: "Scooter", fi: "Potkulauta", ru: "Самокат", fr: "Trottinette", es: "Patinete" , vi: "Xe trượt scooter" },
        path: 'M2 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M18 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M6 18h9l3-3-3-11h-4',
      },
      {
        key: 'bicycle',
        label: { en: "Bicycle", fi: "Polkupyörä", ru: "Велосипед", fr: "Vélo", es: "Bicicleta" , vi: "Xe đạp" },
        path: 'M2 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M16 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M5 17l4-5h5l-2 5H8 M12 17l4-6 M19 17l-4-10h-3 M5 11h4',
      },
      {
        key: 'fuelPump',
        label: { en: "Fuel pump", fi: "Bensapumppu", ru: "Заправка", fr: "Pompe à essence", es: "Surtidor" , vi: "Trụ bơm xăng" },
        path: 'M4 21V4h10v17 M2 21h14 M6 6h6v6H6Z M14 13h2q2 0 2 2v2a2 2 0 0 0 4 0V9l-3-3 M19 6v4l3 2',
      },
      {
        key: 'parking',
        label: { en: "Parking", fi: "Pysäköinti", ru: "Парковка", fr: "Stationnement", es: "Aparcamiento" , vi: "Đỗ xe" },
        path: 'M3 3h18v18H3Z M9 17V7h4a3 3 0 0 1 0 6H9',
      },
    ],
  },
  {
    id: 'clothing',
    title: { en: "Clothing", fi: "Vaatteet", ru: "Одежда", fr: "Vêtements", es: "Ropa" , vi: "Quần áo" },
    icons: [
      {
        key: 'jeans',
        label: { en: "Jeans", fi: "Farkut", ru: "Джинсы", fr: "Jean", es: "Vaqueros" , vi: "Quần jean" },
        path: 'M6 3h12l2 18h-6l-2-9-2 9H4Z M6 7h12 M9 7q0 3-3 3 M15 7q0 3 3 3 M12 7v5',
      },
      {
        key: 'dress',
        label: { en: "Dress", fi: "Mekko", ru: "Платье", fr: "Robe", es: "Vestido" , vi: "Váy" },
        path: 'M8 3h2q2 4 4 0h2l1 5-2 3 5 9q-8 4-16 0l5-9-2-3Z M9 11h6',
      },
      {
        key: 'wristwatch',
        label: { en: "Wristwatch", fi: "Rannekello", ru: "Часы", fr: "Montre", es: "Reloj de pulsera" , vi: "Đồng hồ đeo tay" },
        path: 'M8 7l1-5h6l1 5 M8 17l1 5h6l1-5 M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M12 9v3l2 1 M18 11h2v2h-2',
      },
      {
        key: 'hanger',
        label: { en: "Hanger", fi: "Vaateripustin", ru: "Вешалка", fr: "Cintre", es: "Percha" , vi: "Móc treo quần áo" },
        path: 'M10 6a2 2 0 1 1 4 0q0 1-2 2v2 M12 10L2 17q-1 2 2 2h16q3 0 2-2Z',
      },
      {
        key: 'umbrella',
        label: { en: "Umbrella", fi: "Sateenvarjo", ru: "Зонт", fr: "Parapluie", es: "Paraguas" , vi: "Ô" },
        path: 'M2 12a10 9 0 0 1 20 0q-3-2-6 0-4-2-8 0-3-2-6 0Z M12 3V1 M12 12v7a2 2 0 0 0 4 0 M8 12q0-5 4-9 4 4 4 9',
      },
      {
        key: 'toteBag',
        label: { en: "Tote bag", fi: "Kangaskassi", ru: "Сумка-шопер", fr: "Sac en toile", es: "Bolsa de tela" , vi: "Túi vải" },
        path: 'M5 7h14l2 14H3Z M8 10V6a4 4 0 0 1 8 0v4 M8 16h8',
      },
    ],
  },
  {
    id: 'homeAndRepairs',
    title: { en: "Home and repairs", fi: "Koti ja remontointi", ru: "Дом и ремонт", fr: "Maison et réparations", es: "Casa y reparaciones" , vi: "Nhà ở và sửa chữa" },
    icons: [
      {
        key: 'paintRoller',
        label: { en: "Paint roller", fi: "Maalitela", ru: "Валик", fr: "Rouleau de peinture", es: "Rodillo de pintura" , vi: "Con lăn sơn" },
        path: 'M3 4h14v5H3Z M17 6h3v6h-9v3 M9 15h4v7H9Z',
      },
      {
        key: 'windowFrame',
        label: { en: "Window", fi: "Ikkuna", ru: "Окно", fr: "Fenêtre", es: "Ventana" , vi: "Cửa sổ" },
        path: 'M4 3h16v17H4Z M2 21h20 M12 3v17 M4 11h16 M6 8l3-3 M15 17l3-3',
      },
      {
        key: 'shower',
        label: { en: "Shower", fi: "Suihku", ru: "Душ", fr: "Douche", es: "Ducha" , vi: "Vòi sen" },
        path: 'M5 21V7a4 4 0 0 1 8 0v2 M9 13q0-4 4-4t4 4Z M9 16v2 M13 16v3 M17 16v2 M13 21h.1',
      },
      {
        key: 'gableHouse',
        label: { en: "House with a pitched roof", fi: "Harjakattoinen talo", ru: "Дом со скатной крышей", fr: "Maison à toit en pente", es: "Casa con tejado a dos aguas" , vi: "Nhà mái dốc" },
        path: 'M2 12l7-8 7 8 M13 8h5l4 4h-6 M4 10v11h16v-9 M7 21v-7h4v7 M15 15h3v3h-3Z M16 8V4h3v5',
      },
    ],
  },
  {
    id: 'appliancesAndElectronics',
    title: { en: "Appliances and electronics", fi: "Kodinkoneet ja elektroniikka", ru: "Бытовая техника и электроника", fr: "Électroménager et électronique", es: "Electrodomésticos y electrónica" , vi: "Thiết bị gia dụng và điện tử" },
    icons: [
      {
        key: 'fridge',
        label: { en: "Fridge", fi: "Jääkaappi", ru: "Холодильник", fr: "Réfrigérateur", es: "Frigorífico" , vi: "Tủ lạnh" },
        path: 'M6 3h12v17H6Z M6 9h12 M9 6h.1 M9 12v3 M8 20v2 M16 20v2',
      },
      {
        key: 'microwave',
        label: { en: "Microwave", fi: "Mikroaaltouuni", ru: "Микроволновка", fr: "Micro-ondes", es: "Microondas" , vi: "Lò vi sóng" },
        path: 'M2 6h20v12H2Z M4 8h12v8H4Z M18 9h2 M19 13h.1 M19 16h.1',
      },
      {
        key: 'wifiRouter',
        label: { en: "Router", fi: "Reititin", ru: "Роутер", fr: "Routeur", es: "Router" , vi: "Bộ định tuyến" },
        path: 'M3 14h18v6H3Z M6 14V9 M18 14V9 M6 17h.1 M9 17h.1 M15 17h3 M9 8q3-3 6 0 M7 5q5-4 10 0',
      },
      {
        key: 'washingMachine',
        label: { en: "Washing machine", fi: "Pyykinpesukone", ru: "Стиральная машина", fr: "Lave-linge", es: "Lavadora" , vi: "Máy giặt" },
        path: 'M4 2h16v20H4Z M4 7h16 M7 4.5h2 M16 4.5h.1 M7 14a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M7 14q2-2 5 0t5 0',
      },
      {
        key: 'oven',
        label: { en: "Oven", fi: "Uuni", ru: "Духовка", fr: "Four", es: "Horno" , vi: "Lò nướng" },
        path: 'M4 3h16v18H4Z M4 8h16 M7 5.5h.1 M12 5.5h.1 M17 5.5h.1 M7 11h10v7H7Z M9 13h6',
      },
      {
        key: 'blender',
        label: { en: "Blender", fi: "Tehosekoitin", ru: "Блендер", fr: "Mixeur", es: "Batidora" , vi: "Máy xay" },
        path: 'M7 3h10l-2 12H9Z M6 3h12 M17 5h3v6h-4 M9 15h6l2 6H7Z M12 18h.1 M9 10h6',
      },
      {
        key: 'monitor',
        label: { en: "Monitor", fi: "Näyttö", ru: "Монитор", fr: "Écran", es: "Monitor" , vi: "Màn hình" },
        path: 'M2 4h20v13H2Z M2 14h20 M12 17v4 M7 21h10',
      },
      {
        key: 'speaker',
        label: { en: "Speaker", fi: "Kaiutin", ru: "Колонка", fr: "Enceinte", es: "Altavoz" , vi: "Loa" },
        path: 'M6 2h12v20H6Z M9 15a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M10.5 7a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
      },
      {
        key: 'gameConsole',
        label: { en: "Game console", fi: "Pelikonsoli", ru: "Игровая консоль", fr: "Console de jeux", es: "Videoconsola" , vi: "Máy chơi game" },
        path: 'M5 2h14v20H5Z M8 5h8v7H8Z M8 17h4 M10 15v4 M15 16h.1 M17 18h.1',
      },
      {
        key: 'eReader',
        label: { en: "E-reader", fi: "Lukulaite", ru: "Электронная книга", fr: "Liseuse", es: "Lector electrónico" , vi: "Máy đọc sách" },
        path: 'M5 2h14v20H5Z M7 5h10v13H7Z M9 8h6 M9 11h6 M9 14h4 M11 20h2',
      },
      {
        key: 'usbDrive',
        label: { en: "USB drive", fi: "Muistitikku", ru: "USB-накопитель", fr: "Clé USB", es: "Memoria USB" , vi: "USB" },
        path: 'M8 7h8v14H8Z M9 7V2h6v5 M11 4h.1 M13 4h.1 M10 11h4',
      },
    ],
  },
  {
    id: 'sports',
    title: { en: "Sports", fi: "Urheilu", ru: "Спорт", fr: "Sport", es: "Deporte" , vi: "Thể thao" },
    icons: [
      {
        key: 'stopwatch',
        label: { en: "Stopwatch", fi: "Sekuntikello", ru: "Секундомер", fr: "Chronomètre", es: "Cronómetro" , vi: "Đồng hồ bấm giờ" },
        path: 'M4 14a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 6V3 M9 3h6 M18 7l2-2 M12 10v4l3 2',
      },
      {
        key: 'trophy',
        label: { en: "Trophy", fi: "Pokaali", ru: "Кубок", fr: "Trophée", es: "Trofeo" , vi: "Cúp" },
        path: 'M7 3h10v5q0 6-5 6T7 8Z M7 5H3v2q0 3 4.3 3.6 M17 5h4v2q0 3-4.3 3.6 M12 14v5 M8 19h8v2H8Z',
      },
      {
        key: 'basketball',
        label: { en: "Basketball", fi: "Koripallo", ru: "Баскетбольный мяч", fr: "Basket-ball", es: "Baloncesto" , vi: "Bóng rổ" },
        path: 'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0 M2.5 12h19 M12 2.5v19 M6 4.7q8 7.3 0 14.6 M18 4.7q-8 7.3 0 14.6',
      },
      {
        key: 'baseball',
        label: { en: "Baseball", fi: "Baseballpallo", ru: "Бейсбольный мяч", fr: "Base-ball", es: "Béisbol" , vi: "Bóng chày" },
        path: 'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0 M6.5 4.5q7 7.5 0 15 M17.5 4.5q-7 7.5 0 15 M7 9l3-1 M8 12h3 M7 15l3 1 M17 9l-3-1 M16 12h-3 M17 15l-3 1',
      },
      {
        key: 'blockDumbbell',
        label: { en: "Block dumbbell", fi: "Kulmikas käsipaino", ru: "Прямоугольная гантель", fr: "Haltère à blocs", es: "Mancuerna de bloques" , vi: "Tạ tay dạng khối" },
        path: 'M4 7h4v10H4Z M16 7h4v10h-4Z M8 11h8v2H8Z M2 9h2v6H2Z M20 9h2v6h-2Z',
      },
    ],
  },
  {
    id: 'healthAndBeauty',
    title: { en: "Health and beauty", fi: "Terveys ja kauneus", ru: "Здоровье и красота", fr: "Santé et beauté", es: "Salud y belleza" , vi: "Sức khỏe và làm đẹp" },
    icons: [
      {
        key: 'stethoscope',
        label: { en: "Stethoscope", fi: "Stetoskooppi", ru: "Стетоскоп", fr: "Stéthoscope", es: "Estetoscopio" , vi: "Ống nghe y tế" },
        path: 'M4 3H2v6a5 5 0 0 0 10 0V3h-2 M7 14v3a4 4 0 0 0 8 0v-3 M15 11a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
      },
      {
        key: 'tooth',
        label: { en: "Tooth", fi: "Hammas", ru: "Зуб", fr: "Dent", es: "Diente" , vi: "Răng" },
        path: 'M12 5q-8-5-8 4c0 4 2 5 3 10q1 5 3 0l1-4q1-2 2 0l1 4q2 5 3 0c1-5 3-6 3-10q0-9-8-4Z M10 4l4 3',
      },
      {
        key: 'perfume',
        label: { en: "Perfume", fi: "Hajuvesi", ru: "Флакон духов", fr: "Parfum", es: "Perfume" , vi: "Nước hoa" },
        path: 'M6 9h12v12H6Z M9 9V5h6v4 M10 5V2h4v3 M9 13h6v4H9Z',
      },
      {
        key: 'cream',
        label: { en: "Cream", fi: "Voide", ru: "Крем", fr: "Crème", es: "Crema" , vi: "Kem dưỡng" },
        path: 'M6 3h12l-2 14H8Z M8 17h8v4H8Z M7 6h10 M12 8c-5 6 5 6 0 0Z',
      },
      {
        key: 'lotus',
        label: { en: "Meditation", fi: "Meditaatio", ru: "Медитация", fr: "Méditation", es: "Meditación" , vi: "Thiền" },
        path: 'M12 20C5 20 2 16 2 11q7 0 10 9Zm0 0c7 0 10-4 10-9q-7 0-10 9Zm0 0q-8-9 0-16 8 7 0 16Z',
      },
      {
        key: 'eyeDrops',
        label: { en: "Eye drops", fi: "Silmätipat", ru: "Капли для глаз", fr: "Collyre", es: "Gotas para los ojos" , vi: "Thuốc nhỏ mắt" },
        path: 'M5 8h8v13H5Z M6 8V5h6v3 M7 5V2h4v3 M17 7c-6 7 6 7 0 0Z M7 13h4 M7 16h4',
      },
    ],
  },
  {
    id: 'finance',
    title: { en: "Finance", fi: "Talous", ru: "Финансы", fr: "Finances", es: "Finanzas" , vi: "Tài chính" },
    icons: [
      {
        key: 'billfold',
        label: { en: "Billfold", fi: "Lompakko", ru: "Бумажник", fr: "Porte-billets", es: "Billetera" , vi: "Ví gập" },
        path: 'M3 7l13-4 2 4 M3 7h17v13H3Z M20 11h-6a2.5 2.5 0 0 0 0 5h6 M14 13.5h.1',
      },
      {
        key: 'cashStack',
        label: { en: "Cash", fi: "Käteinen", ru: "Наличные", fr: "Espèces", es: "Efectivo" , vi: "Tiền mặt" },
        path: 'M2 6h18v10H2Z M5 19h17V9 M8 11a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M5 11h.1 M17 11h.1',
      },
      {
        key: 'piggy',
        label: { en: "Piggy bank", fi: "Säästöpossu", ru: "Копилка", fr: "Tirelire", es: "Hucha" , vi: "Heo đất" },
        path: 'M3 13c0-4 4-7 9-7h2l4-2v4l2 2h2v5h-3l-2 2v3h-3v-2H8v2H5v-4Z M3 12Q1 12 1 9 M9 9h4 M17 11h.1',
      },
      {
        key: 'bankBuilding',
        label: { en: "Bank", fi: "Pankki", ru: "Банк", fr: "Banque", es: "Banco" , vi: "Ngân hàng" },
        path: 'M2 8l10-5 10 5Z M4 19h16 M2 21h20 M6 11v6 M12 11v6 M18 11v6',
      },
      {
        key: 'vault',
        label: { en: "Vault", fi: "Kassakaappi", ru: "Сейф", fr: "Chambre forte", es: "Cámara acorazada" , vi: "Kho tiền" },
        path: 'M3 3h18v18H3Z M6 6h12v12H6Z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 9v3l2 1 M4 21v1 M20 21v1',
      },
      {
        key: 'currencyExchange',
        label: { en: "Currency exchange", fi: "Valuutanvaihto", ru: "Обмен валют", fr: "Change de devises", es: "Cambio de divisas" , vi: "Đổi ngoại tệ" },
        path: 'M3 7h16l-3-3 M19 7l-3 3 M21 17H5l3-3 M5 17l3 3 M3 7v4 M21 17v-4',
      },
      {
        key: 'investmentChart',
        label: { en: "Investments", fi: "Sijoitukset", ru: "Инвестиции", fr: "Placements", es: "Inversiones" , vi: "Đầu tư" },
        path: 'M3 3v18h18 M7 17v-4 M12 17V9 M17 17V7 M6 10l6-5 3 1 5-4 M16 2h4v4',
      },
      {
        key: 'receipt',
        label: { en: "Receipt", fi: "Kuitti", ru: "Чек", fr: "Reçu", es: "Recibo" , vi: "Biên lai" },
        path: 'M5 3h14v19l-3-2-4 2-4-2-3 2Z M8 7h8 M8 11h8 M8 15h3 M14 15h2',
      },
      {
        key: 'coinStack',
        label: { en: "Coins", fi: "Kolikot", ru: "Монеты", fr: "Pièces", es: "Monedas" , vi: "Tiền xu" },
        path: 'M3 7c0-4 12-4 12 0s-12 4-12 0Z M3 7v4c0 4 12 4 12 0V7 M3 11v4q0 3 7 3 M11 16c0-4 11-4 11 0s-11 4-11 0Z M11 16v3c0 4 11 4 11 0v-3',
      },
      {
        key: 'documentCase',
        label: { en: "Document case", fi: "Asiakirjasalkku", ru: "Портфель документов", fr: "Porte-documents", es: "Portadocumentos" , vi: "Cặp đựng tài liệu" },
        path: 'M3 8h18v12H3Z M8 8V4h8v4 M3 13h18 M10 12h4v3h-4Z',
      },
    ],
  },
  {
    id: 'education',
    title: { en: "Education", fi: "Koulutus", ru: "Образование", fr: "Éducation", es: "Educación" , vi: "Giáo dục" },
    icons: [
      {
        key: 'openBook',
        label: { en: "Open book", fi: "Avoin kirja", ru: "Открытая книга", fr: "Livre ouvert", es: "Libro abierto" , vi: "Sách mở" },
        path: 'M12 6q-5-4-10-2v15q5-2 10 2 5-4 10-2V4q-5-2-10 2Z M12 6v15 M5 8q2 0 4 1 M15 9q2-1 4-1 M5 12q2 0 4 1 M15 13q2-1 4-1',
      },
      {
        key: 'pencil',
        label: { en: "Pencil", fi: "Lyijykynä", ru: "Карандаш", fr: "Crayon", es: "Lápiz" , vi: "Bút chì" },
        path: 'M4 16L16 4q2-2 4 0t0 4L8 20l-5 1Z M14 6l4 4 M4 16l4 4',
      },
      {
        key: 'languageStudy',
        label: { en: "Languages", fi: "Kielet", ru: "Языки", fr: "Langues", es: "Idiomas" , vi: "Ngôn ngữ" },
        path: 'M2 3h14v10H8l-4 3v-3H2Z M8 11l2-6 2 6 M9 9h2 M17 8h5v11h-3l-3 3v-3h-5v-4 M15 12h5 M17.5 11v1 M16 14q1 2 4 3 M19 12q0 3-4 5',
      },
      {
        key: 'drawingCompass',
        label: { en: "Drawing compass", fi: "Harppi", ru: "Циркуль", fr: "Compas", es: "Compás" , vi: "Compa" },
        path: 'M12 2v2 M10 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M10 7L5 21l3-3 4-10 M14 7l5 14-3-3-4-10 M8 13h8',
      },
      {
        key: 'atom',
        label: { en: "Atom", fi: "Atomi", ru: "Атом", fr: "Atome", es: "Átomo" , vi: "Nguyên tử" },
        path: 'M12 3a4 9 0 1 0 0 18a4 9 0 1 0 0-18 M4.2 7.5a9 4 30 1 0 15.6 9 9 4 30 1 0-15.6-9 M4.2 16.5a9 4-30 1 0 15.6-9 9 4-30 1 0-15.6 9 M12 12h.1',
      },
      {
        key: 'ruler',
        label: { en: "Ruler", fi: "Viivain", ru: "Линейка", fr: "Règle", es: "Regla" , vi: "Thước kẻ" },
        path: 'M2 17L17 2l5 5L7 22Z M7 12l2 2 M10 9l2 2 M13 6l2 2 M4 15l2 2',
      },
      {
        key: 'magnet',
        label: { en: "Magnet", fi: "Magneetti", ru: "Магнит", fr: "Aimant", es: "Imán" , vi: "Nam châm" },
        path: 'M4 4h5v9a3 3 0 0 0 6 0V4h5v9a8 8 0 0 1-16 0Z M4 8h5 M15 8h5',
      },
      {
        key: 'hourglass',
        label: { en: "Hourglass", fi: "Tiimalasi", ru: "Песочные часы", fr: "Sablier", es: "Reloj de arena" , vi: "Đồng hồ cát" },
        path: 'M5 3h14 M5 21h14 M7 3v4q0 2 5 5-5 3-5 5v4 M17 3v4q0 2-5 5 5 3 5 5v4 M9 18l3-2 3 2',
      },
    ],
  },
  {
    id: 'leisure',
    title: { en: "Leisure", fi: "Vapaa-aika", ru: "Отдых", fr: "Loisirs", es: "Ocio" , vi: "Thư giãn" },
    icons: [
      {
        key: 'musicNote',
        label: { en: "Concert", fi: "Konsertti", ru: "Концерт", fr: "Concert", es: "Concierto" , vi: "Buổi hòa nhạc" },
        path: 'M9 18V5l12-3v13 M9 9l12-3 M9 18c0 4-6 4-6 1 0-2 4-3 6-1Z M21 15c0 4-6 4-6 1 0-2 4-3 6-1Z',
      },
      {
        key: 'camera',
        label: { en: "Photography", fi: "Valokuvaus", ru: "Фотография", fr: "Photographie", es: "Fotografía" , vi: "Nhiếp ảnh" },
        path: 'M2 7h5l2-3h6l2 3h5v13H2Z M8 13a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M18 9h1',
      },
      {
        key: 'beachUmbrella',
        label: { en: "Beach", fi: "Ranta", ru: "Пляж", fr: "Plage", es: "Playa" , vi: "Bãi biển" },
        path: 'M3 12a9 9 0 0 1 18 0q-3-2-6 0-3-2-6 0-3-2-6 0Z M12 12v8 M5 21h14 M9 12q0-6 3-9 3 3 3 9',
      },
      {
        key: 'museum',
        label: { en: "Museum", fi: "Museo", ru: "Музей", fr: "Musée", es: "Museo" , vi: "Bảo tàng" },
        path: 'M2 8l10-5 10 5Z M4 19h16 M2 21h20 M6 11v5 M18 11v5 M10 16v-3a2 2 0 0 1 4 0v3Z',
      },
      {
        key: 'suitcase',
        label: { en: "Suitcase", fi: "Matkalaukku", ru: "Чемодан", fr: "Valise", es: "Maleta" , vi: "Va li" },
        path: 'M4 6h16v14H4Z M9 6V3h6v3 M8 6v14 M16 6v14 M6 20v2 M18 20v2',
      },
      {
        key: 'sailboat',
        label: { en: "Sailboat", fi: "Purjevene", ru: "Парусник", fr: "Voilier", es: "Velero" , vi: "Thuyền buồm" },
        path: 'M12 2v14 M11 4L4 15h7 M14 7l5 8h-5 M2 17h20l-3 4H5Z',
      },
      {
        key: 'theatre',
        label: { en: "Theatre", fi: "Teatteri", ru: "Театр", fr: "Théâtre", es: "Teatro" , vi: "Nhà hát" },
        path: 'M2 5q5 2 10 0v7q-1 5-5 5t-5-5Z M12 8q5 2 10 0v7q-1 5-5 5-3 0-4-2 M4.5 9h.1 M9.5 9h.1 M5 13q2 2 4 0 M15 12h.1 M19 12h.1 M15 17q2-2 4 0',
      },
    ],
  },
  {
    id: 'family',
    title: { en: "Family and children", fi: "Perhe ja lapset", ru: "Семья и дети", fr: "Famille et enfants", es: "Familia y niños" , vi: "Gia đình và trẻ em" },
    icons: [
      {
        key: 'floppyDog',
        label: { en: "Dog with floppy ears", fi: "Luppakorvainen koira", ru: "Собака с висячими ушами", fr: "Chien aux oreilles tombantes", es: "Perro de orejas caídas" , vi: "Chó tai cụp" },
        path: 'M6 7q0-3 6-3t6 3v8q0 5-6 5t-6-5Z M6 7Q3 6 2 12t4 4 M18 7q3-1 4 5t-4 4 M9 11h.1 M15 11h.1 M10 14h4l-2 2Z M12 16v2',
      },
      {
        key: 'toyBlocks',
        label: { en: "Toy blocks", fi: "Palikat", ru: "Детские кубики", fr: "Cubes de jeu", es: "Bloques de juguete" , vi: "Khối xếp hình" },
        path: 'M2 13l6-3 6 3v6l-6 3-6-3Z M2 13l6 3 6-3 M8 16v6 M14 14l3-1.5 5 2.5v5l-5 2-3-1.5 M14 15l3 1.5 5-1.5 M17 16.5V22 M6 9V5l6-3 6 3v5l-3 1.5 M6 5l6 3 6-3 M12 8v4',
      },
      {
        key: 'babyBottle',
        label: { en: "Baby bottle", fi: "Tuttipullo", ru: "Детская бутылочка", fr: "Biberon", es: "Biberón" , vi: "Bình sữa" },
        path: 'M8 9h8v11q0 1-1 1H9q-1 0-1-1Z M7 6h10v3H7Z M10 6V4a2 2 0 0 1 4 0v2 M12 12h4 M13 15h3 M12 18h4',
      },
    ],
  },
] as const;

export const EXTRA_CATEGORY_ICON_PATHS: ReadonlyMap<string, string> = new Map(
  CATEGORY_ICON_SECTIONS.flatMap(({ icons }) => icons.map(({ key, path }) => [key, path] as const)),
);
