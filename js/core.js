/* Maskob — Catalog, helpers, state, store, rendering, orders, reports, actions.
   Loaded by index.html as a classic script: files share one global scope and run in the order listed there. */
/* ---------- Catalog (from NEW ORDER PEPAR QATIF.xlsx) ---------- */
const ICONS={
 tea:'<path d="M6 10h10v5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z"/><path d="M16 11h1.5a2 2 0 0 1 0 4H16"/><path d="M6 12 3.5 9.5"/><path d="M9 10V8h4v2"/><path d="M11 8V6"/>',
 icetea:'<path d="M7 8h10l-1.2 12H8.2z"/><path d="M6 8h12"/><path d="M13 8l2-5h2"/><path d="M8 13h8"/>',
 icecream:'<path d="M8 11l4 10 4-10"/><path d="M8 11a4 4 0 1 1 8 0z"/>',
 dairy:'<path d="M8 3h8v3l2 3v12H6V9l2-3z"/><path d="M6 9h12"/><path d="M10 14h4"/>',
 cheese:'<path d="M3 18v-6l12-7 6 7v6z"/><path d="M3 12h18"/><circle cx="8" cy="15" r="1"/><circle cx="15" cy="15.5" r="1.2"/>',
 spices:'<rect x="7" y="8" width="10" height="13" rx="2"/><path d="M8 4h8v4H8z"/><path d="M10 13h4M10 16h4"/>',
 flour:'<path d="M12 21V7"/><path d="M12 11c-3 0-4-2-4-4 2 0 4 1 4 4zM12 11c3 0 4-2 4-4-2 0-4 1-4 4zM12 16c-3 0-4-2-4-4 2 0 4 1 4 4zM12 16c3 0 4-2 4-4-2 0-4 1-4 4zM12 7c-1.5-1-1.5-3 0-4 1.5 1 1.5 3 0 4z"/>',
 frozen:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
 produce:'<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/>',
 packaging:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 disposables:'<path d="M7 3v6a2 2 0 0 0 2 2v10M11 3v6a2 2 0 0 1-2 2M9 3v5"/><path d="M16 21v-9M16 12c-2 0-3-2-3-4.5S14 3 16 3s3 2 3 4.5-1 4.5-3 4.5z"/>',
 cleaning:'<path d="M8 10h7v11H8z"/><path d="M9 10V7h5v3"/><path d="M14 7h3l2-2"/><path d="M18 9h2M18 5.5l1.5-1.5"/>',
 tools:'<path d="M5 7h11v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/>',
 other:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.4"/>',
 warehouse:'<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
 branch:'<path d="M4 10h16l-1.5-5h-13z"/><path d="M5 10v10h14V10M10 20v-5h4v5"/>',
 manager:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/><path d="M15.5 13.5 12 17l-3.5-3.5"/>',
 chart:'<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/>',
 lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
 check:'<path d="m5 12 5 5 9-10"/>'
};
const svg=(k,w)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]||ICONS.other}</svg>`;

/* each line: ar|en|unit|par|sku|bn|ur */
const CATS=[
{k:'tea',n:['الشاي والسكر','Tea & sugar','চা ও চিনি','چائے اور چینی'],tone:'sun',items:`شاي 5 لتر|Tea 5 L|pakt|150|sk-0002|চা 5 লিটার|چائے 5 لیٹر
سكر 5 لتر|Sugar 5 L|pakt|150|sk-0156|চিনি 5 লিটার|چینی 5 لیٹر
شاي 7 لتر|Tea 7 L|pakt|100|sk-0002|চা 7 লিটার|چائے 7 لیٹر
سكر 7 لتر|Sugar 7 L|pakt|100|sk-0156|চিনি 7 লিটার|چینی 7 لیٹر
شاي 9 لتر|Tea 9 L|pakt|100|sk-0002|চা 9 লিটার|چائے 9 لیٹر
سكر 9 لتر|Sugar 9 L|pakt|100|sk-0156|চিনি 9 লিটার|چینی 9 لیٹر
شاي 14 لتر|Tea 14 L|pakt|0|sk-0002|চা 14 লিটার|چائے 14 لیٹر
سكر 14 لتر|Sugar 14 L|pakt|0|sk-0156|চিনি 14 লিটার|چینی 14 لیٹر
شاي عراقي|Iraqi tea|pakt|50||ইরাকি চা|عراقی چائے
سكر عراقي|Iraqi sugar|pakt|50||ইরাকি চিনি|عراقی چینی
شاي أخضر|Green tea|KG|10|sk-0237|গ্রিন টি|سبز چائے
شاي هندي|Indian tea|KG|3|SKU-21|ভারতীয় চা|ہندوستانی چائے
شاي سيلاني|Ceylon tea|KG|3|SKU-20|সিলন চা|سیلونی چائے
شاي 150 جم|Tea 150g|pakt|5||চা 150 গ্রাম|چائے 150 گرام
شاي كرك 12 لتر|Karak tea 12 L|pakt|0|sk-0157|কারাক চা 12 লিটার|کڑک چائے 12 لیٹر
سكر كرك 12 لتر|Karak sugar 12 L|pakt|0|sk-0156|কারাক চিনি 12 লিটার|کڑک چینی 12 لیٹر
شاي كرك 3 لتر|Karak tea 3 L|pakt|50||কারাক চা 3 লিটার|کڑک چائے 3 لیٹر
سكر كرك 3 لتر|Karak sugar 3 L|pakt|50||কারাক চিনি 3 লিটার|کڑک چینی 3 لیٹر
شاي كرك 6 لتر|Karak tea 6 L|pakt|50||কারাক চা 6 লিটার|کڑک چائے 6 لیٹر
سكر كرك 6 لتر|Karak sugar 6 L|pakt|50||কারাক চিনি 6 লিটার|کڑک چینی 6 لیٹر
سحلب|Sahlab powder|pakt|0|sk-0162|সাহলাব পাউডার|سحلب پاؤڈر
فيتامين سي|Vitamin C|pakt|0||ভিটামিন সি|وٹامن سی
فستق|Pistachios|pakt|0|sk-0279|পেস্তা|پستہ
لوز|Almonds|pakt|0|sk-0280|কাঠবাদাম|بادام
كاجو|Cashews|pakt|0|sk-0270|কাজু বাদাম|کاجو
ميرمية|Sage (Meramia)|pakt|4|sk-0142|সেজ পাতা (মেরামিয়া)|میرمیہ (سیج)`},
{k:'icetea',n:['الآيس تي والمشروبات','Ice tea & drinks','আইস টি ও পানীয়','آئس ٹی اور مشروبات'],tone:'navy',items:`آيس كركديه|Hibiscus|bottle|14|sk-0217|আইস হিবিস্কাস|آئس کرکدیہ (ہبسکس)
لومي|Lome|bottle|5|sk-0245|লুমি|لومی
شمام|Melon|bottle|10|sk-0183|মেলন|خربوزہ
آيس تي خوخ|Ice tea peach|bottle|5|PR-2|পীচ আইস টি|آڑو آئس ٹی
بيرة بطيخ|Watermelon beer|kegs|0|PR-4|তরমুজ বিয়ার|تربوز بیئر
سيرب بطيخ|Watermelon syrup|bottle|10||তরমুজ সিরাপ|تربوز شربت
باربيكان كلاسيك|Barbican Classic|BOX|20||বারবিকান ক্লাসিক|باربیکن کلاسک
آيس تي توت|Ice tea raspberry|bottle|5||রাস্পবেরি আইস টি|رس بھری آئس ٹی`},
{k:'icecream',n:['الآيس كريم','Ice cream','আইসক্রিম','آئس کریم'],tone:'sand',items:`آيس كريم مانجو|Mango ice cream|L|1|sk-0208|ম্যাঙ্গো আইসক্রিম|آم آئس کریم
آيس كريم فانيليا|Vanilla ice cream|L|1|SKU-M33|ভ্যানিলা আইসক্রিম|ونیلا آئس کریم`},
{k:'dairy',n:['الحليب والحلويات','Milk & desserts','দুধ ও ডেজার্ট','دودھ اور میٹھے'],tone:'navy',items:`مياه 330 مل|Water 330 ml|BOX|30|SKU-M25|পানি 330 মিলি|پانی 330 ملی لیٹر
حليب المراعي|Almarai milk 1L|BOX|6|sk-0170|আলমারাই দুধ 1 লিটার|المراعی دودھ 1 لیٹر
حليب رينبو|Rainbow milk|PC|4|SKU-M32|রেইনবো দুধ|رینبو دودھ
قشطة|Cream (French toast)|BOX|4|SKU-M9|ক্রিম (ফ্রেঞ্চ টোস্ট)|بالائی (فرنچ ٹوسٹ)
كريمة خفق|Whipping cream|L|3|SKU-M10|হুইপিং ক্রিম|وہپنگ کریم
عسل مسكوب|Maskob honey|KG|9|SKU-M30|মাসকুব মধু|مسکوب شہد
حليب مكثف|Condensed milk|PC|2||কনডেন্সড মিল্ক|گاڑھا دودھ
مكس مكسرات|Mixed nuts|PC|50|sk-0227|মিক্সড বাদাম|مکس میوہ جات
كريم كراميل|Caramel cream|BOX|4||ক্যারামেল ক্রিম|کیریمل کریم
فرنش توست|French toast|pakt|15|sk-0234|ফ্রেঞ্চ টোস্ট|فرنچ ٹوسٹ
قهوة مسكوب|Maskob coffee|pakt|5|SK-0305|মাসকুব কফি|مسکوب کافی`},
{k:'cheese',n:['الأجبان والمواد الغذائية','Cheese & groceries','পনির ও খাদ্যসামগ্রী','پنیر اور کھانے کا سامان'],tone:'sun',items:`جبنة شيدر|Cheddar cheese|PC|15|SKU-M26|চেডার পনির|چیڈر پنیر
جبنة فيتا|Feta cheese|KG|10||ফেটা পনির|فیٹا پنیر
جبنة سائلة|Puck cheese|BOX|6|sk-0182|তরল পনির|مائع پنیر
بلوك جبن كيري|Kiri cheese block|KG|30|sk-0017|কিরি পনির ব্লক|کیری پنیر بلاک
لبنة|Labneh|KG|20|sk-0288|লাবনেহ|لبنہ
جبنة موزاريلا|Mozzarella|PC|25||মোজারেলা পনির|موزاریلا پنیر
زبدة|Butter|PC|5|SKU-M31|মাখন|مکھن
زيت|Oil|BOX|2||তেল|تیل
زيت زيتون|Olive oil|L|1||জলপাই তেল|زیتون کا تیل
زبادي|Yogurt|KG|18||দই|دہی
طحينة خام|Tahini|KG|2||তাহিনি|طحینہ (تل کی چٹنی)
معجون تمر|Date paste|KG|3|SKU-M29|খেজুর পেস্ট|کھجور کا پیسٹ
سيرب تمر|Date syrup|bottle|3|sk-0179|খেজুর সিরাপ|کھجور کا شربت
دبس رمان|Pomegranate molasses|bottle|15||ডালিম মোলাসেস|انار کا شیرہ
بيض|Eggs|PC|150||ডিম|انڈے
عصير ليمون|Lemon juice|bottle|2||লেবুর রস|لیموں کا رس`},
{k:'spices',n:['البهارات','Spices','মসলা','مصالحے'],tone:'sand',items:`ملح|Salt|KG|2|sk-0021|লবণ|نمک
فلفل أسود|Black pepper|KG|4||গোলমরিচ|کالی مرچ
قرفة عيدان|Cinnamon sticks|KG|4||দারুচিনি কাঠি|دار چینی (ڈنڈی)
قرفة بودرة|Cinnamon powder|KG|2||দারুচিনি গুঁড়া|دار چینی پاؤڈر
ورق غار|Bay leaf|KG|4||তেজপাতা|تیز پات
ليمون أسود|Black lomi|KG|0.5|sk-0244|কালো লেবু (লুমি)|کالا لیموں
فانيليا بودرة|Vanilla powder|KG|3||ভ্যানিলা পাউডার|ونیلا پاؤڈر
خميرة|Yeast|KG|4||ইস্ট|خمیر
زعفران|Saffron|pakt|0||জাফরান|زعفران
ملح ليمون|Lemon salt|KG|2||লেবু লবণ|لیموں نمک
زعتر إكسترا|Zaatar extra|KG|12|sk-0291|জাতার এক্সট্রা|زعتر ایکسٹرا
سماق أحمر فاتح|Light red sumac|KG|2||হালকা লাল সুমাক|ہلکا سرخ سماق
سماق أحمر غامق|Dark red sumac|KG|2||গাঢ় লাল সুমাক|گہرا سرخ سماق
حبة البركة|Black seed|KG|1||কালোজিরা|کلونجی
سمسم|Sesame|KG|1||তিল|تل
سكر|Sugar|KG|3||চিনি|چینی`},
{k:'flour',n:['الدقيق والعجين','Flour & dough','ময়দা ও খামির','آٹا اور گوندھا آٹا'],tone:'sand',items:`دقيق مسكوبة|Maskoba flour|KG|15||মাসকুবা ময়দা|مسکوبہ آٹا
دقيق أبيض كويتي|Kuwaiti white flour|KG|40||কুয়েতি সাদা ময়দা|کویتی سفید آٹا
دقيق مطاحن الأولى|Fatira flour|KG|80||ফাতিরা ময়দা|فطیرہ آٹا
عجين مسكوبة|Maskoba dough|KG|0||মাসকুবা খামির|مسکوبہ گوندھا آٹا
دجاج مسخن|Musakhan chicken|KG|0||মুসাখান মুরগি|مسخن چکن
سبانخ مطبوخة|Cooked spinach|KG|0||রান্না করা পালং|پکا ہوا پالک`},
{k:'frozen',n:['الدجاج والسمبوسة','Chicken & samosa','মুরগি ও সমুচা','چکن اور سموسے'],tone:'navy',items:`دجاج|Chicken|KG|70||মুরগি|چکن
سبانخ|Spinach|BOX|3||পালং শাক|پالک
سمبوسة باكيت|Samosa packet|BOX|4||সমুচা প্যাকেট|سموسہ پیکٹ
سمبوسة جبن|Cheese samosa|PC|0|sk-0181|পনির সমুচা|پنیر سموسہ
سمبوسة جبن فيتا نعناع|Feta & mint samosa|PC|0||ফেটা ও পুদিনা সমুচা|فیٹا پودینہ سموسہ
سمبوسة مسخن دجاج|Chicken musakhan samosa|PC|0||মুসাখান মুরগি সমুচা|مسخن چکن سموسہ`},
{k:'produce',n:['الخضار والأعشاب','Vegetables & herbs','সবজি ও ভেষজ','سبزیاں اور جڑی بوٹیاں'],tone:'ok',items:`بصل|Onion|KG|20||পেঁয়াজ|پیاز
ليمون|Fresh lemon|KG|6||তাজা লেবু|تازہ لیموں
برتقال|Orange|KG|0||কমলা|مالٹا
زنجبيل|Fresh ginger|KG|0||তাজা আদা|تازہ ادرک
حبق|Habaq|KG|6|sk-0125|হাবাক|حبق
نعناع|Mint|KG|12|sk-0140|পুদিনা|پودینہ
وزاب|Wazab|KG|6|sk-0141|ওয়াজাব|وزاب`},
{k:'packaging',n:['التغليف والأكواب','Packaging & cups','প্যাকেজিং ও কাপ','پیکنگ اور کپ'],tone:'navy',items:`ورق زبدة مسكوب|Maskob paper|BOX|3|SKU-M27|মাসকুব বাটার পেপার|مسکوب بٹر پیپر
بوكس فريش توست|Fresh toast box|PC|500|sk-0248|ফ্রেশ টোস্ট বক্স|فریش ٹوسٹ باکس
بوكس فطائر|Pie box|PC|1000||পাই বক্স|فطیرہ باکس
باكيت مسكوب|Maskob packet|PC|1000||মাসকুব প্যাকেট|مسکوب پیکٹ
سكر مسكوب|Maskob sugar|BOX|5|SKU-M27|মাসকুব চিনি|مسکوب چینی
سكر ستيفيانا|Steviana sugar|BOX|4|SKU-M28|স্টেভিয়ানা চিনি|اسٹیویانا چینی
كوب مسكوبة|Maskoba cup|BOX|3|SKU-M40|মাসকুবা কাপ|مسکوبہ کپ
غطاء كوب مسكوبة|Maskoba cup cover|BOX|3|SKU-M41|মাসকুবা কাপের ঢাকনা|مسکوبہ کپ کا ڈھکن
كوب زجاج مسكوب|Glass cup|BOX|50|SKU-M12|মাসকুব কাচের কাপ|مسکوب شیشے کا کپ
كوب بيرة زجاج|Beer glass cup|BOX|4|sk-0232|কাচের বিয়ার কাপ|شیشے کا بیئر کپ
كوب ورق مسكوب 8oz|Paper cup 8oz|BOX|6|SKU-M35|কাগজের কাপ 8oz|کاغذی کپ 8oz
غطاء كوب شاي|Tea cup lid|BOX|10|SKU-M37|চায়ের কাপের ঢাকনা|چائے کپ کا ڈھکن
كوب ورق 12oz|Paper cup 12oz|BOX|7|SKU-M36|কাগজের কাপ 12oz|کاغذی کپ 12oz
غطاء كوب ورق 12oz|Paper cup lid 12oz|BOX|4|SKU-M38|কাগজের কাপের ঢাকনা 12oz|کاغذی کپ ڈھکن 12oz
غطاء كوب آيس تي 12oz|Ice tea cup lid 12oz|BOX|3|SKU-M38|আইস টি কাপের ঢাকনা 12oz|آئس ٹی کپ ڈھکن 12oz
غطاء بيرة جديد|New beer cover|BOX|1|sk-0247|নতুন বিয়ার ঢাকনা|نیا بیئر ڈھکن
أكواب آيس كريم|Ice cream cups|BOX|2|sk-0233|আইসক্রিম কাপ|آئس کریم کپ`},
{k:'disposables',n:['المستهلكات','Disposables','ব্যবহার্য সামগ্রী','استعمال کی اشیاء'],tone:'sun',items:`ورق رول كاشير|Cashier paper roll|BOX|5|SKU-M55|ক্যাশিয়ার পেপার রোল|کیشیئر پیپر رول
سكين بلاستيك|Plastic knife|BOX|2|SKU-M54|প্লাস্টিক ছুরি|پلاسٹک چھری
شوكة بلاستيك|Black fork|BOX|3|SKU-M53|কালো কাঁটাচামচ|کالا کانٹا
ملاعق بلاستيك|Black spoon|BOX|3|SKU-M52|কালো চামচ|کالے چمچ
حامل أكواب 4|Cup holder 4|BOX|4|SKU-M43|কাপ হোল্ডার 4|کپ ہولڈر 4
حامل أكواب 2|Cup holder 2|BOX|5|SKU-M42|কাপ হোল্ডার 2|کپ ہولڈر 2
ماسك أكواب|Cup sleeve|BOX|3|SKU-M48|কাপ স্লিভ|کپ سلیو
عصا تقليب|Stir sticks|PC|4|SKU-M46|নাড়ার কাঠি|ہلانے کی اسٹک
قفازات يد|Hand gloves (L)|BOX|6|SKU-M47|হাতের গ্লাভস (L)|دستانے (L)
غطاء للرأس|Hair net|PC|3|SKU-M51|হেয়ার নেট|ہیئر نیٹ
كمام وجه|Face mask|PC|4|SKU-M61|মুখের মাস্ক|ماسک
استرتش فيلم|Stretch film|PC|6|SKU-M56|স্ট্রেচ ফিল্ম|اسٹریچ فلم
رول تيشو|Roll tissues|PC|18|SKU-M59|টিস্যু রোল|ٹشو رول
فوطة بار|Bar towel|PC|20|sk-0215|বার তোয়ালে|بار تولیہ
رول صلاحية|Date roll|PC|5|sk-0236|মেয়াদ লেবেল রোল|ایکسپائری لیبل رول
مزاز|Straws|pakt|10|sk-0159|স্ট্র|اسٹرا
ملعقة آيس كريم|Ice cream spoon|PC|1|sk-0210|আইসক্রিম চামচ|آئس کریم چمچ
فلاتر قهوة|Coffee filters|PC|1||কফি ফিল্টার|کافی فلٹر
شمع براد|Small candles|pakt|5||ছোট মোমবাতি|چھوٹی موم بتیاں`},
{k:'cleaning',n:['النظافة','Cleaning','পরিষ্কার','صفائی'],tone:'ok',items:`صابون|Soap|L|1|SKU-M57|সাবান|صابن
كلوركس|Clorox|L|1|SKU-M60|ক্লোরক্স|کلوراکس
ملمع زجاج|Glass cleaner|L|1|SKU-M65|কাচ পরিষ্কারক|شیشہ صاف کرنے والا
سميل|Smiller|L|2|SKU-M58|সুগন্ধি (স্মেলার)|خوشبو (سمیل)
معطر حمام|Toilet freshener|PC|2|sk-0214|টয়লেট এয়ার ফ্রেশনার|باتھ روم ایئر فریشنر
إسفنج غسيل|Sponge|PC|4|SKU-M62|ধোয়ার স্পঞ্জ|دھونے کا اسفنج
سلك أواني|Steel wire|PC|3|SKU-M69|হাঁড়ি মাজার তার|برتن دھونے کی تار
أكياس قمامة|Trash bags|Bags|6|SKU-M63|ময়লার ব্যাগ|کچرے کے تھیلے
مساحة|Squeegee|PC|2|SKU-M67|ওয়াইপার|وائپر
مكنسة|Broom|PC|2|SKU-M68|ঝাড়ু|جھاڑو
موب|Mop|PC|4|sk-0213|মপ|پوچا (موپ)`},
{k:'tools',n:['الأدوات والملصقات','Tools & stickers','সরঞ্জাম ও স্টিকার','برتن اور اسٹیکرز'],tone:'navy',items:`مج أزرق 1|Mug blue 1|PC|15|sk-0249|নীল মগ 1|نیلا مگ 1
مج أزرق 2|Mug blue 2|PC|15|sk-0250|নীল মগ 2|نیلا مگ 2
مج أبيض|Mug white|PC|15|sk-0251|সাদা মগ|سفید مگ
جالون شاي 1.5|Tea gallon 1.5|PC|100||চায়ের গ্যালন 1.5|چائے گیلن 1.5
جالون آيس تي|Ice tea gallon|PC|10||আইস টি গ্যালন|آئس ٹی گیلن
ستيكر خوخ|Peach sticker|PC|5||পীচ স্টিকার|آڑو اسٹیکر
ستيكر فيمتو|Vimto sticker|PC|5||ভিমটো স্টিকার|وِمٹو اسٹیکر
ستيكر توت|Raspberry sticker|PC|5||রাস্পবেরি স্টিকার|رس بھری اسٹیکر
ستيكر كركديه|Hibiscus sticker|PC|5||হিবিস্কাস স্টিকার|کرکدیہ اسٹیکر
ستيكر لومي|Lome sticker|PC|5||লুমি স্টিকার|لومی اسٹیکر
ستيكر بيرة بطيخ|Beer sticker|PC|5||বিয়ার স্টিকার|بیئر اسٹیکر
مناديل مسكوب|Maskob tissue|BOX|4|sk-0100|মাসকুব টিস্যু|مسکوب ٹشو
بوكس فلين مسكوب|Maskob ice box|PC|2||মাসকুব আইস বক্স|مسکوب آئس باکس
شنط مسكوب|Maskob bags|box|6|SKU-M49|মাসকুব ব্যাগ|مسکوب تھیلے`},
{k:'other',n:['أصناف أخرى','Other items','অন্যান্য','دیگر اشیاء'],tone:'sand',items:`سمسمية|Semsemiah|PC|3||সেমসেমিয়া|سمسمیہ
شيا|Chia|PC|5||চিয়া|چیا
شابورة|Shabura|PC|0||শাবুরা|شابورہ
زبدة كاليا|Kaliya butter|KG|||কালিয়া মাখন|کالیا مکھن
كريمة مسكوبة|Maskoba cream|PC|||মাসকুবা ক্রিম|مسکوبہ کریم
براد زجاج|Glass teapot (Barad)|PC|||কাচের চায়ের পাত্র|شیشے کی چائے دانی
عباد الشمس|Sunflower|PC|||সূর্যমুখী|سورج مکھی
ماء ورد|Rose water|PC|1||গোলাপ জল|عرق گلاب
قهوة نسكافيه|Nescafe|PC|||নেসকাফে|نیسکافے
أسطوانة CO2|CO2 cylinder|PC|||CO2 সিলিন্ডার|CO2 سلنڈر
كريم كراميل زجاج|Glass caramel cream|PC|||কাচের ক্যারামেল ক্রিম|شیشے والی کیریمل کریم`}
];
const ITEMS=[],ITEM={};
CATS.forEach(c=>{c.list=c.items.trim().split('\n').map((ln,i)=>{const f=ln.split('|').map(s=>(s||'').trim());
  const it={id:c.k+'-'+(i+1),cat:c.k,ar:f[0],en:f[1],uk:f[2],par:f[3]===''?null:+f[3],sku:f[4],bn:f[5]||f[1],ur:f[6]||f[0]};ITEMS.push(it);ITEM[it.id]=it;return it;});});
const CAT={};CATS.forEach(c=>CAT[c.k]=c);
const catName=c=>c.n[LI()]||c.n[0];
const nameOf_=it=>it[LANG]||it.ar;
const altOf=it=>LANG==='en'?it.ar:it.en;
const unitL=k=>(UNITS[k]||[k])[LI()]||(UNITS[k]||[k])[0];

/* ---------- helpers ---------- */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const fmt=n=>{n=+n||0;return Number.isInteger(n)?String(n):String(+n.toFixed(3))};
const num=v=>{const n=parseFloat(String(v).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[০-৯]/g,d=>'০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(',','.'));return isFinite(n)&&n>0?Math.round(n*1000)/1000:0};
const when=iso=>{if(!iso)return'';try{return new Date(iso).toLocaleString(LOCALE[LANG],{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return iso.slice(0,16)}};
const nowIso=()=>new Date().toISOString();
const roleL=r=>t('r_'+r);
const statusL=s=>T['s_'+s]?t('s_'+s):s;
const kindL=k=>T['k_'+k]?t('k_'+k):'';
const lineInfo=l=>{const it=ITEM[l.id];if(it)return{name:nameOf_(it),u:unitL(it.uk),cat:it.cat,par:it.par};return{name:l.ar||l.id,u:l.u||'',cat:l.cat||'other',par:null}};
const icoFor=()=>'';
const prepRole=o=>o.kind==='return'?'branch':'warehouse';
const recvRole=o=>o.kind==='return'?'warehouse':'branch';
function newNumber(){const d=new Date(),p=n=>String(n).padStart(2,'0');const r=Math.random().toString(36).slice(2,5).toUpperCase();return`MS-${String(d.getFullYear()).slice(2)}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${r}`}

/* ---------- state ---------- */
const S={
  role:LS.get('mk.role',null), branch:LS.get('mk.branch',null), tab:LS.get('mk.tab',null),
  orders:[], branches:['القطيف'], loaded:false, mode:'connecting', stale:false, error:null,
  draft:LS.get('mk.draft',{kind:'supply',lines:{},stock:{},note:''}),
  cat:'all', q:'', open:null, work:{}, confirm:null, review:false, filter:'active',
  me:null, names:{}, newBranch:'', busy:false,
  pins:{}, pinsLoaded:false, pad:{val:'',step:'enter',first:'',err:''}, fails:0, lockUntil:0, pinIn:{}
};
/* code keys: 'manager' | 'warehouse' | 'branch:<name>' — each salts its own hash */
function pinEntries(){
  const e=[];
  for(const k of ['admin','manager','warehouse','hr','finance'])if(hashForKey(k))e.push({role:k,key:k,h:S.pins[k]});
  const br=S.pins.br||{};Object.keys(br).forEach(b=>{if(hashForKey('branch:'+b))e.push({role:'branch',branch:b,key:'branch:'+b,h:br[b]})});
  (S.users||[]).forEach(u=>{if(u.h&&u.active!==false)e.push({role:u.role,branch:u.branch||null,key:'u',ukey:'user:'+u.id,h:u.h,user:u.id,name:u.name})});
  return e;
}
const hashForKey=key=>{const h=key.startsWith('branch:')?(S.pins.br||{})[key.slice(7)]:S.pins[key];return h&&!String(h).startsWith('off:')?h:undefined};
S.auth=LS.get('mk.auth',null);
/* full-access accounts (role 'owner') look at the app as one department or branch at a time */
function applyOwnerView(){const v=LS.get('mk.ownerView',{role:'dash'})||{role:'dash'};S.realRole='owner';S.role=v.role||'dash';S.branch=v.role==='branch'?(v.branch||S.branches[0]||null):S.branch}
if(S.role==='owner')applyOwnerView();
function setAuth(a){S.auth=a;LS.set('mk.auth',a)}
const saveDraft=()=>LS.set('mk.draft',S.draft);

function sha256js(bytes){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l=bytes.length,n=((l+9+63)>>6)<<6,m=new Uint8Array(n);m.set(bytes);m[l]=0x80;
  const dv=new DataView(m.buffer);dv.setUint32(n-4,l*8);
  const W=new Uint32Array(64),r=(x,s)=>(x>>>s)|(x<<(32-s));
  for(let o=0;o<n;o+=64){
    for(let i=0;i<16;i++)W[i]=dv.getUint32(o+i*4);
    for(let i=16;i<64;i++){const a=W[i-15],b=W[i-2];W[i]=(W[i-16]+(r(a,7)^r(a,18)^(a>>>3))+W[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0}
    let[a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+W[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}
    H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
  }
  return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}
async function hashPin(role,pin){
  const data=new TextEncoder().encode('maskob:'+role+':'+pin);
  try{if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){}
  return sha256js(data);
}
function checkAuth(){
  if(S.fb||!S.role||!S.pinsLoaded)return;
  const a=S.auth;
  const key=a&&(a.role==='branch'?'branch:'+a.branch:a.role);
  const u=a&&a.user&&(S.users||[]).find(x=>x.id===a.user);
  const okUser=u&&u.active!==false&&u.h===a.h&&u.role===a.role;
  if(!a||a.role!==(S.realRole||S.role)||(a.role==='branch'&&a.branch!==S.branch)||(a.user?!okUser:(!hashForKey(key)||a.h!==hashForKey(key)))){S.role=null;setAuth(null);LS.set('mk.role',null);S.open=null;S.review=false}
}

/* ---------- store ---------- */
let db=null,userCap=null,dlCap=null;const chains={};
function queue(id,fn){const p=(chains[id]||Promise.resolve()).catch(()=>{}).then(fn);chains[id]=p;return p}
const DEMO_KEY='mk.demo.orders';
const Store={
  async init(){
    if(window.FIREBASE_CONFIG){return this.fbInit()}
    const c=window.claude;
    if(c&&typeof c.use==='function'){
      c.use('downloads').then(d=>{dlCap=d},()=>{});
      try{[db,userCap]=await Promise.all([c.use('db'),c.use('user')])}catch(e){db=null}
    }
    if(userCap){try{S.me=await userCap.id()}catch(e){}}
    if(db){S.mode='live';this.live()}else{S.mode='demo';this.demo()}
  },
  live(){
    const tm=setTimeout(()=>{if(!S.loaded||S.fromCache){S.stale=true;render()}},10000);
    db.collection('orders').orderBy('createdAt','desc').limit(500).onSnapshot(snap=>{
      S.orders=snap.docs.map(d=>Object.assign({},d.data(),{id:d.id}));
      S.loaded=true;S.fromCache=snap.metadata.fromCache;
      if(!snap.metadata.fromCache){S.stale=false;clearTimeout(tm)}
      resolveNames();render();
    },err=>{clearTimeout(tm);S.error=err.code;S.loaded=true;render()});
    db.doc('config/pins').onSnapshot(s=>{
      if(!s.exists&&s.metadata.fromCache)return;
      S.pins=s.exists?Object.assign({},s.data()):{};S.pinsLoaded=true;checkAuth();render();
    },()=>{S.pins={};S.pinsLoaded=true;checkAuth();render()});
    db.doc('config/main').onSnapshot(s=>{if(s.exists){const d=s.data();if(Array.isArray(d.branches)&&d.branches.length)S.branches=d.branches.map(String)}render()},()=>{});
  },
  demo(){
    let o=LS.get(DEMO_KEY,null);
    if(!Array.isArray(o)){o=demoSeed();LS.set(DEMO_KEY,o)}
    S.orders=o;S.branches=LS.get('mk.demo.branches',['القطيف']);S.days=LS.get('mk.demo.days',{});S.codeLen=LS.get('mk.demo.codeLen',null);S.loaded=true;
    S.pins=LS.get('mk.demo.pins',{});S.notify=LS.get('mk.demo.notify',{});xLoadDemo();S.contact=LS.get('mk.demo.contact',{});S.pinsLoaded=true;checkAuth();render();
  },
  async save(o){
    window.logAct&&logAct('add','orders',o.id);
    if(S.mode==='live')return queue(o.id,()=>db.doc('orders/'+o.id).set(o));
    const i=S.orders.findIndex(x=>x.id===o.id);if(i>=0)S.orders[i]=o;else S.orders.unshift(o);
    LS.set(DEMO_KEY,S.orders);render();
  },
  async remove(id){
    window.logAct&&logAct('del','orders',id);
    if(S.mode==='live')return queue(id,()=>db.doc('orders/'+id).delete());
    S.orders=S.orders.filter(x=>x.id!==id);LS.set(DEMO_KEY,S.orders);render();
  },
  async patch(id,f){
    if(f&&(f.status||f.scheduledFor))window.logAct&&logAct('upd','orders',id);
    if(S.mode==='live')return queue(id,()=>db.doc('orders/'+id).update(f));
    const o=S.orders.find(x=>x.id===id);if(o)Object.assign(o,f);LS.set(DEMO_KEY,S.orders);render();
  },
  /* ----- Firebase (Firestore + anonymous auth), used when firebase-config.js is present ----- */
  async fbInit(){
    S.fb=true;S.mode='live';S.pins={};
    const v='10.12.2',base=`https://cdn.jsdelivr.net/npm/firebase@${v}/`;
    const load=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.crossOrigin='anonymous';s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)});
    try{
      await load(base+'firebase-app-compat.js');
      await Promise.all([load(base+'firebase-auth-compat.js'),load(base+'firebase-firestore-compat.js')]);
      firebase.initializeApp(window.FIREBASE_CONFIG);
      const auth=firebase.auth();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      if(!auth.currentUser)await new Promise(r=>{const u=auth.onAuthStateChanged(x=>{u();r(x)})});
      if(!auth.currentUser)await auth.signInAnonymously();
      S.uid=auth.currentUser.uid;
      db=firebase.firestore();
      try{db.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(e){}
      try{await db.enablePersistence({synchronizeTabs:true})}catch(e){}
      setTimeout(()=>{if(!S.pinsLoaded){S.stale=true;render()}},12000);
    }catch(e){S.error=(e&&e.code)||'firebase';S.loaded=true;S.pinsLoaded=true;render();return}
    // public config: branch list + whether first-time setup is done
    db.doc('config/main').onSnapshot(s=>{
      const d=s.exists?s.data():{};
      if(Array.isArray(d.branches)&&d.branches.length)S.branches=d.branches.map(String);
      S.days=d.days&&typeof d.days==='object'?d.days:{};
      S.codeLen=[4,5,6].includes(d.codeLen)?d.codeLen:null;
      S.mainReady=!!d.ready;S.mainSeen=true;this.fbReadyCheck();render();
    },e=>{S.error=e.code;S.pinsLoaded=true;render()});
    // resume an existing session on this device
    try{const s=await db.doc('sessions/'+S.uid).get();
      if(s.exists){const a=s.data();S.role=a.role;S.branch=a.branch||null;if(a.role==='owner'){applyOwnerView();const want=S.role==='branch'?S.branch:null;
        if((a.branch||null)!==want){const n=Object.assign({},a);delete n.branch;if(want)n.branch=want;try{await db.doc('sessions/'+S.uid).set(n);S.auth=n}catch(e){}}}else S.realRole=null;S.auth=a;S.userId=a.user||null;S.userName=a.name||null;S.me=a.name||S.me}else{S.role=null;S.auth=null}
    }catch(e){S.role=null}
    S.sessChecked=true;this.fbReadyCheck();
  },
  fbReadyCheck(){
    if(!S.mainSeen||!S.sessChecked)return;
    S.pinsLoaded=true;S.stale=false;
    if(S.role)this.fbStart();else this.fbStop();
    render();
  },
  fbStart(){
    this.fbStop();
    xStart();
    this._unsubC=db.doc('config/contact').onSnapshot(s=>{S.contact=s.exists?s.data():{};render()},()=>{});
    if(S.role==='hr'||S.role==='finance'){S.loaded=true;render();return}   // finance: no orders either   // human resources: employees and leave only, no orders
    if(S.role==='admin'){            // system admin: settings only, no orders
      S.loaded=true;
      this._unsubP=db.doc('config/pins').onSnapshot(s=>{S.pins=s.exists?Object.assign({},s.data()):{};S.pinsReadable=true;render()},
        e=>{if(e.code==='permission-denied')this.fbSignOut()});   // code changed: sign out
      this._unsubN=db.doc('config/notify').onSnapshot(s=>{S.notify=s.exists?s.data():{};render()},()=>{});
      render();return;
    }
    const tm=setTimeout(()=>{if(!S.loaded){S.stale=true;render()}},10000);
    let q=db.collection('orders');
    q=S.role==='branch'?q.where('branch','==',S.branch):q.orderBy('createdAt','desc').limit(500);
    this._unsubO=q.onSnapshot(snap=>{
      S.orders=snap.docs.map(d=>Object.assign({},d.data(),{id:d.id})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      S.loaded=true;S.stale=false;clearTimeout(tm);announceNotices();render();
    },e=>{clearTimeout(tm);
      if(e.code==='permission-denied'){this.fbSignOut();return}   // code changed or session revoked
      S.error=e.code;S.loaded=true;render()});
    // operations management can read the codes only until a system admin code exists (one-time handover)
    if(S.role==='manager')this._unsubP=db.doc('config/pins').onSnapshot(s=>{S.pins=s.exists?Object.assign({},s.data()):{};S.pinsReadable=true;render()},()=>{S.pinsReadable=false;S.pins={};render()});
  },
  fbStop(){if(this._unsubO){this._unsubO();this._unsubO=null}if(this._unsubP){this._unsubP();this._unsubP=null}if(this._unsubN){this._unsubN();this._unsubN=null}if(this._unsubC){this._unsubC();this._unsubC=null}xStop();S.contact=null;S.notify=null;S.waDraft=null;S.orders=[];S.loaded=false;S.pins={};S.pinsReadable=undefined},
  async fbSignOut(){
    this.fbStop();try{await db.doc('sessions/'+S.uid).delete()}catch(e){}
    S.role=null;S.realRole=null;S.auth=null;S.userId=null;S.userName=null;LS.set('mk.role',null);S.open=null;S.review=false;S.pad={val:'',step:'enter',first:'',err:''};render();
  },
  async fbTrySession(role,branch,h,user,name){
    const d={role,h,at:new Date().toISOString()};if(role==='branch')d.branch=branch;if(user){d.user=user;d.name=name||''}
    if(role==='owner'){const v=LS.get('mk.ownerView',null);if(v&&v.role==='branch'&&v.branch)d.branch=v.branch}   // the branch the general manager works as
    try{await db.doc('sessions/'+S.uid).set(d);return true}catch(e){return false}
  },
  async saveCodeLen(n){
    if(S.fb)return queue('config',()=>db.doc('config/main').set({codeLen:n},{merge:true}));
    LS.set('mk.demo.codeLen',n);
  },
  async saveDays(days){
    if(S.fb)return queue('config',()=>db.doc('config/main').set({days},{merge:true}));
    LS.set('mk.demo.days',days);
  },
  async saveBranches(list){
    if(S.fb)return queue('config',()=>db.doc('config/main').set({branches:list,ready:true},{merge:true}));
    if(S.mode==='live')return queue('config',()=>db.doc('config/main').set({branches:list}));
    S.branches=list;LS.set('mk.demo.branches',list);render();
  },
  async savePins(p){
    if(S.mode==='live')return queue('pins',()=>db.doc('config/pins').set(p));
    S.pins=p;LS.set('mk.demo.pins',p);render();
  }
};
function demoSeed(){
  const L=(id,qty,stock)=>({id,qty,stock});
  return[{id:'MS-DEMO-001',num:'MS-DEMO-001',kind:'supply',branch:'القطيف',status:'pending',createdAt:'2026-10-11T08:30:00.000Z',updatedAt:'2026-10-11T08:30:00.000Z',note:'مثال توضيحي من ملف طلب القطيف',
    lines:[L('tea-19',10,10),L('tea-20',10,10),L('tea-21',15,5),L('dairy-2',5,11),L('dairy-8',50,0),L('disposables-13',8,0),L('tools-4',10,10)]},
   {id:'MS-DEMO-002',num:'MS-DEMO-002',kind:'supply',branch:'القطيف',status:'approved',createdAt:'2026-10-09T07:00:00.000Z',approvedAt:'2026-10-09T09:10:00.000Z',updatedAt:'2026-10-09T09:10:00.000Z',note:'مثال توضيحي',
    lines:[{id:'cheese-3',qty:4,approved:4},{id:'cheese-5',qty:1,approved:1},{id:'spices-11',qty:2,approved:2},{id:'packaging-9',qty:6,approved:6},{id:'produce-6',qty:1,approved:1}]}];
}
async function resolveNames(){
  if(!userCap||!userCap.profiles)return;
  const ids=new Set();S.orders.forEach(o=>['createdBy','approvedBy','shippedBy','receivedBy'].forEach(k=>{if(o[k]&&!(o[k] in S.names))ids.add(o[k])}));
  if(!ids.size)return;
  try{const ps=await userCap.profiles([...ids]);let ch=false;ids.forEach(id=>{const n=(ps&&ps[id]&&ps[id].name)||'';S.names[id]=n;if(n)ch=true});if(ch)render()}catch(e){}
}
const personOf=id=>(id&&S.names[id])||'';

/* ---------- forecast ----------
   Per branch: take its last 8 approved supply orders (approved / shipped / received),
   use the delivered quantity of each item (received, else sent, else approved),
   and compute a weighted average per order where each newer order weighs 1.35x the previous.
   Items missing from an order count as 0 for that order, so rarely ordered items shrink.
   Order cycle = median days between orders; daily use = forecast / cycle. */
const FC_MIN=7,FC_WIN=10,FC_OK=['approved','shipped','received'];
const ITEM_POS={};ITEMS.forEach((it,i)=>ITEM_POS[it.id]=i);
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const delivered=l=>+(l.received??l.sent??l.approved??l.qty??0)||0;
const roundQty=(id,x)=>{const it=ITEM[id];return it&&(it.uk==='KG'||it.uk==='L')?Math.round(x*2)/2:Math.round(x)};
function forecastBranch(b){
  const h=S.orders.filter(o=>o.branch===b&&o.kind!=='return'&&FC_OK.includes(o.status)&&o.createdAt)
    .sort((x,y)=>String(x.createdAt).localeCompare(String(y.createdAt)));
  const n=h.length;if(n<FC_MIN)return{ready:false,n,items:[],map:{}};
  const win=h.slice(-FC_WIN),ts=win.map(o=>Date.parse(o.createdAt)||0);
  const gaps=[];for(let i=1;i<ts.length;i++){const g=(ts[i]-ts[i-1])/864e5;if(g>0.25)gaps.push(g)}
  const cycle=gaps.length?Math.min(30,Math.max(1,Math.round(median(gaps)*10)/10)):7;
  const ids=new Set();win.forEach(o=>(o.lines||[]).forEach(l=>ids.add(l.id)));
  const items=[];
  ids.forEach(id=>{
    const qs=win.map(o=>{const l=(o.lines||[]).find(x=>x.id===id);return l?delivered(l):0});
    let sw=0,sq=0;qs.forEach((q,i)=>{const w=Math.pow(1.35,i);sw+=w;sq+=w*q});
    const raw=sq/sw,app=qs.filter(q=>q>0).length,last=qs[qs.length-1];
    if(app<2&&last===0)return;
    const f=roundQty(id,raw);if(f<=0)return;
    const ra=avg(qs.slice(-2)),old=qs.slice(0,-2),oa=old.length?avg(old):ra;
    const trend=oa===0?(ra>0?'up':'flat'):ra>oa*1.2?'up':ra<oa*0.8?'down':'flat';
    const share=app/qs.length,conf=share>=0.6&&app>=3?'high':share>=0.3?'mid':'low';
    items.push({id,f,daily:raw/cycle,trend,conf,last});
  });
  items.sort((x,y)=>(ITEM_POS[x.id]??1e9)-(ITEM_POS[y.id]??1e9));
  const map={};items.forEach(x=>map[x.id]=x);
  return{ready:true,n,cycle,last:win[win.length-1].createdAt,next:new Date(ts[ts.length-1]+cycle*864e5).toISOString(),items,map};
}
const whenDay=iso=>{try{return new Date(iso).toLocaleDateString(LOCALE[LANG],{weekday:'short',day:'numeric',month:'short'})}catch(e){return String(iso).slice(0,10)}};

/* ---------- derived ---------- */
function visible(){
  if(S.role==='branch')return S.orders.filter(o=>o.branch===S.branch);
  return S.orders;
}
/* overdue: waiting longer than allowed at the current stage */
const LATE_HOURS={pending:24,approved:24,shipped:48};
/* ---------- delivery scheduling ---------- */
const fromKey=k=>{const [y,m,d]=String(k).split('-').map(Number);return new Date(y,m-1,d)};
const weekdayName=i=>{try{return new Date(2024,0,7+i).toLocaleDateString(LOCALE[LANG],{weekday:'short'})}catch(e){return String(i)}};
const dateLabel=k=>{try{return fromKey(k).toLocaleDateString(LOCALE[LANG],{weekday:'long',day:'numeric',month:'short'})}catch(e){return k}};
/* next delivery day for a branch, from tomorrow (leaves time to prepare); tomorrow if no days are set */
function nextDeliveryDay(branch){
  const days=(S.days&&S.days[branch])||[];
  const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+1);
  if(!days.length)return dayKey(d);
  for(let i=0;i<14;i++){if(days.includes(d.getDay()))return dayKey(d);d.setDate(d.getDate()+1)}
  return dayKey(d);
}
const isWaitingDispatch=o=>o.kind!=='return'&&o.status==='approved';
function lateInfo(o){
  if(o.status==='approved'&&o.scheduledFor){            // scheduled: late once the delivery day has ended
    const due=fromKey(o.scheduledFor);due.setDate(due.getDate()+1);
    const h=(Date.now()-due.getTime())/36e5;
    return h>0?{h:Math.max(h,1)}:null;
  }
  if(!(o.status in LATE_HOURS))return null;
  const since={pending:o.createdAt,approved:o.approvedAt,shipped:o.shippedAt}[o.status];
  const h=(Date.now()-Date.parse(since))/36e5;
  return h>=LATE_HOURS[o.status]?{h}:null;
}
const lateLabel=li=>li.h<48?t('lateH',{n:Math.floor(li.h)}):t('lateD',{n:Math.floor(li.h/24)});
const latePill=o=>{const li=lateInfo(o);return li?`<span class="pill late">${esc(lateLabel(li))}</span>`:''};
function counts(){
  const v=visible();
  const sets={
    tasks:v.filter(o=>(o.kind!=='return'&&o.status==='shipped')||(o.kind==='return'&&o.status==='approved')),
    pending:v.filter(o=>o.status==='pending'),
    prep:v.filter(o=>o.kind!=='return'&&o.status==='approved'),
    incoming:v.filter(o=>o.kind==='return'&&o.status==='shipped'),
    sched:v.filter(o=>isWaitingDispatch(o)&&o.scheduledFor&&o.scheduledFor<=dayKey(Date.now()))
  };
  const r={};for(const k in sets){r[k]=sets[k].length;r[k+'Late']=sets[k].some(lateInfo)}
  return r;
}
function tabsFor(){
  const c=counts();
  if(S.role==='branch')return[{k:'new',l:t('tab_new')},{k:'tasks',l:t('tab_tasks'),b:c.tasks,late:c.tasksLate},{k:'orders',l:t('tab_mine'),b:notices(visible()).length},{k:'sales',l:t('tab_sales')},{k:'maint',l:t('tab_maint')},{k:'checks',l:t('tab_checks')},{k:'lr',l:t('tab_shifts'),b:(S.leaveReqs||[]).filter(r=>r.status==='pending').length},{k:'forms',l:t('tab_forms')}];
  if(S.role==='manager')return[{k:'pending',l:t('tab_pending'),b:c.pending,late:c.pendingLate},{k:'report',l:t('tab_report'),g:'rep'},{k:'all',l:t('tab_all')},{k:'salesAll',l:t('tab_sales'),g:'rep'},{k:'maintAll',l:t('tab_maint'),b:(S.maint||[]).filter(m=>m.status!=='done').length,late:(S.maint||[]).some(m=>m.urgent&&m.status!=='done')},{k:'stock',l:t('tab_stock'),b:typeof stockLow==='function'?stockLow().length:0}];
  if(S.role==='admin')return[{k:'branches',l:t('tab_settings')},{k:'users',l:t('tab_users')},{k:'actlog',l:t('tab_log2')},{k:'catalog',l:t('tab_catalog')}];
  if(S.role==='hr')return hrTabs();
  if(S.role==='finance'&&typeof finTabs==='function')return finTabs();
  if(S.role==='warehouse')return[{k:'prep',l:t('tab_prep'),b:c.prep,late:c.prepLate},{k:'sched',l:t('tab_sched'),b:c.sched,late:c.schedLate},{k:'incoming',l:t('tab_incoming'),b:c.incoming,late:c.incomingLate},{k:'done',l:t('tab_log')},{k:'stock',l:t('tab_stock'),b:typeof stockLow==='function'?stockLow().length:0,late:typeof stockLow==='function'?stockLow().some(it=>stockState(it.id)==='out'):false}];
  if(S.role==='dash')return[{k:'dash',l:t('tab_dash')}];
  return[];
}

/* ---------- side menu icons (the set itself is in icons.js) ---------- */
const navIcon=k=>typeof ico==='function'?ico(NAV_ICON[k]||'dot'):'';

/* the side menu: pages marked g:'rep' sit together under one "Reports" entry that opens and closes
   (open by itself while one of them is shown); a department with a single report keeps it as a plain entry */
function navHtml(tabs){
  const one=x=>`<button class="tab" role="tab" aria-selected="${x.k===S.tab}" data-act="tab" data-k="${x.k}"><span class="tab-ico">${navIcon(x.k)}</span><span class="tab-l">${esc(x.l)}</span>${x.b?`<span class="badge num${x.late?' late':''}">${x.b}</span>`:''}</button>`;
  const grp=tabs.filter(x=>x.g==='rep');if(grp.length<2)return tabs.map(one).join('');
  const inside=grp.some(x=>x.k===S.tab),open=inside||!!S.navRep,b=grp.reduce((s,x)=>s+(+x.b||0),0);let done=false;
  return tabs.map(x=>{if(x.g!=='rep')return one(x);if(done)return'';done=true;
    return`<button class="tab tab-grp${inside?' in':''}" data-act="navGrp" aria-expanded="${open}"><span class="tab-ico">${navIcon('rep')}</span><span class="tab-l">${esc(t('nav_reports'))}</span>${!open&&b?`<span class="badge num${grp.some(g=>g.late)?' late':''}">${b}</span>`:''}<span class="tab-car" aria-hidden="true">${typeof ico==='function'?ico('chevron'):'▾'}</span></button>
      <div class="tab-sub" role="group" aria-label="${esc(t('nav_reports'))}"${open?'':' hidden'}>${grp.map(one).join('')}</div>`}).join('');
}
/* ---------- render ---------- */
function applyLang(){
  const app=document.getElementById('app');
  app.dir=RTL[LANG]?'rtl':'ltr';app.lang=LANG;app.className='lang-'+LANG;
  document.documentElement.lang=LANG;
  const sel=document.getElementById('langSel');sel.value=LANG;sel.setAttribute('aria-label',t('language'));
}
function render(){
  const ae=document.activeElement;const fid=ae&&ae.id;let ss=null,se=null;
  try{if(fid&&ae.selectionStart!=null){ss=ae.selectionStart;se=ae.selectionEnd}}catch(e){}
  const shb=document.querySelector('.sh-body');const shTop=shb?shb.scrollTop:0;

  applyLang();
  const authed=!!(S.role&&S.pinsLoaded);
  renderWho(authed);
  const tabs=authed?tabsFor():[];
  if(authed&&!tabs.some(x=>x.k===S.tab))S.tab=tabs[0].k;
  const nav=document.getElementById('tabs');nav.hidden=!authed;nav.setAttribute('aria-label',t('nav_menu'));
  document.getElementById('layout').classList.toggle('no-nav',!authed);
  const mb=document.getElementById('menuBtn');mb.hidden=!authed;mb.setAttribute('aria-label',t('nav_menu'));
  document.getElementById('app').classList.toggle('menu-open',!!(authed&&S.menuOpen));
  document.getElementById('tabsIn').innerHTML=navHtml(tabs);
  document.getElementById('main').innerHTML=banner()+(!S.pinsLoaded?`<p class="hint">${t('checking')}</p>`:authed?view():pinPad());
  document.getElementById('cart').innerHTML=(authed&&S.role==='branch'&&S.tab==='new')?cartBar():'';
  document.getElementById('sheet').innerHTML=authed?(S.scan&&window.scanSheet?scanSheet():S.imp?impSheet():S.openAsset&&window.assetSheet?assetSheet():S.openExp&&window.expenseSheet?expenseSheet():S.openSi&&window.supInvSheet?supInvSheet():S.openSup&&window.supplierSheet?supplierSheet():S.openStockRecv&&window.stockRecvSheet?stockRecvSheet():S.openStock&&window.stockItemSheet?stockItemSheet():S.openUser&&window.userSheet?userSheet():S.openVc?voucherSheet():S.openForm?formSheet():S.openTpl?templateSheet():S.openStaff?staffSheet():S.openLr?lrSheet():S.openCat?catSheet():S.openMaint?maintSheet():S.openEmp?empSheet():S.openContract?contractSheet():S.openLeave?leaveSheet():S.openCust?custodySheet():S.openEos?eosSheet():S.openLic?licenseSheet():S.openAdv?advanceSheet():sheet()):'';

  if(typeof decorateIcons==='function')decorateIcons();
  const nb=document.querySelector('.sh-body');if(nb)nb.scrollTop=shTop;
  if(fid){const el=document.getElementById(fid);if(el&&el!==document.activeElement){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
}
function banner(){
  if(S.mode==='demo')return`<div class="note-bar">${esc(t('demo'))}</div>`;
  if(S.error)return`<div class="note-bar">${esc(t('loadErr',{c:S.error}))}</div>`;
  if(S.stale)return`<div class="note-bar">${esc(t('stale'))}</div>`;
  return'';
}
function renderWho(authed){
  const el=document.getElementById('who');
  const lo=document.getElementById('logoutBox');
  if(!authed){el.innerHTML='';lo.innerHTML='';return}
  if(S.realRole==='owner'){const cur=S.role==='branch'?'branch:'+S.branch:S.role;
    el.innerHTML=`<div class="who ow"><span>${S.userName?`<b>${esc(S.userName)}</b>`:esc(roleL('owner'))}</span><select class="ow-sel" id="ownerView" aria-label="${esc(t('ow_view'))}">${cur.startsWith('branch:')?`<option value="" selected disabled>${esc(t('ow_depts'))}</option>`:''}${['dash','manager','warehouse','hr','finance','admin'].map(r=>`<option value="${r}" ${cur===r?'selected':''}>${esc(roleL(r))}</option>`).join('')}</select>${S.branches.length?`<select class="ow-sel${cur.startsWith('branch:')?' on':''}" id="ownerBranch" aria-label="${esc(t('ow_branches'))}"><option value="" disabled ${cur.startsWith('branch:')?'':'selected'}>${esc(t('ow_branches'))}</option>${S.branches.map(b=>`<option value="branch:${esc(b)}" ${cur==='branch:'+b?'selected':''}>${esc(b)}</option>`).join('')}</select>`:''}</div>`}
  else el.innerHTML=`<div class="who"><span>${S.userName?`<b>${esc(S.userName)}</b> · `:''}${esc(roleL(S.role))}${S.role==='branch'?`: <b>${esc(S.branch||'')}</b>`:''}</span></div>`;
  lo.innerHTML=`<button class="logout-btn" data-act="logout">${typeof ico==='function'?ico('logout','b-ic'):''}${esc(t('logout'))}</button>`;
}
function pinPad(){
  const L=S.pad;
  const setup=S.fb?!S.mainReady:!S.pins.manager;
  if(setup&&L.step==='enter')L.step='create';
  const title=L.step==='create'?t('setupTitle'):L.step==='confirm'?t('confirmCode'):t('homeTitle');
  const CL=codeLenSet();
  const hint=L.step==='enter'?'':(CL?t('digitsN',{n:CL}):t('digits'));
  const locked=Date.now()<S.lockUntil;
  const dots=Array.from({length:CL||Math.max(4,L.val.length)},(_,i)=>`<i class="${i<L.val.length?'f':''}"></i>`).join('');
  const keys=['1','2','3','4','5','6','7','8','9'].map(k=>`<button data-act="pinKey" data-k="${k}" ${locked?'disabled':''}>${k}</button>`).join('');
  return`<div class="pin"><div class="brand-badge" role="img" aria-label="مسكوب MASKOB"></div>
    <div><h2>${esc(title)}</h2>${hint?`<p class="hint">${esc(hint)}</p>`:''}</div>
    <div class="dots" aria-label="${esc(t('digitsEntered',{n:L.val.length}))}">${dots}</div>
    <div class="err" role="alert">${locked?esc(t('tooMany')):L.err?esc(L.err):L.checking?`<span class="chk-note">${esc(t('checking'))}</span>`:''}</div>
    <div class="pad">${keys}<button class="fn" data-act="pinDel" aria-label="${esc(t('delDigit'))}">⌫</button><button data-act="pinKey" data-k="0" ${locked?'disabled':''}>0</button><button class="fn" data-act="pinClear">${t('clear')}</button></div>
    ${L.step==='enter'?'':`<button class="btn btn-navy" style="width:100%" data-act="pinGo" ${L.val.length>=4&&!locked&&!S.busy?'':'disabled'}>${t('continue')}</button>`}
  </div>`;
}
function view(){
  if(!S.loaded)return`<p class="hint">${t('loadingOrders')}</p>`;
  const tb=S.tab,v=visible();
  if(S.role==='dash'&&window.dashboardView)return dashboardView();
  if(tb==='stock'&&(S.role==='warehouse'||S.role==='manager')&&window.stockView)return stockView();
  if(S.role==='admin')return tb==='catalog'?catalogView():tb==='users'&&window.usersView?usersView():tb==='actlog'&&window.logView?logView():branchesView();
  if(S.role==='hr')return hrView(tb);
  if(S.role==='finance'&&window.financeView)return financeView(tb);
  if(tb==='report'&&S.role==='manager')return reportView();
  /* branches no longer have a forecast page (removed 2026-11) */
  if(S.role==='branch'&&tb==='lr')return branchStaffTab(tb);
  if(S.role==='branch'&&tb==='forms')return branchFormsView();
  if(S.role==='branch')return noticeBanner(v)+branchView(tb,v);
  return staffView(tb,v);
}
/* branch alerts: delivery date set or changed by the warehouse/operations */
const notices=v=>v.filter(o=>o.schedNotice&&o.schedNotice.to&&!['received','cancelled','rejected'].includes(o.status));
function noticeText(o){
  const n=o.schedNotice,num=o.num||o.id;
  return n.from?{title:t('nTitle'),body:t('nBody',{n:num,a:dateLabel(n.from),b:dateLabel(n.to)})}:{title:t('nTitleSet'),body:t('nBodySet',{n:num,b:dateLabel(n.to)})};
}
function noticeBanner(v){
  const list=notices(v);
  const canAsk=typeof Notification!=='undefined'&&Notification.permission==='default';
  if(!list.length&&!canAsk)return'';
  return list.map(o=>{const x=noticeText(o);return`<div class="notice" role="status"><div style="flex:1;min-width:0"><b>${esc(x.title)}</b><div class="num">${esc(x.body)}</div></div><div class="row"><button class="btn btn-ghost" data-act="open" data-id="${esc(o.id)}">${esc(o.num||o.id)}</button><button class="btn btn-sun" data-act="ackNotice" data-id="${esc(o.id)}">${t('nOk')}</button></div></div>`}).join('')
    +(canAsk?`<button class="btn btn-ghost notify-on" data-act="enableAlerts">${t('nEnable')}</button>`:'');
}
/* system notification for alerts that arrive while the app is open */
function announceNotices(){
  if(S.role!=='branch')return;
  const seen=S._seenN||(S._seenN=null);
  const now=notices(S.orders).map(o=>({o,k:o.id+'|'+o.schedNotice.at}));
  if(seen===null){S._seenN=new Set(now.map(x=>x.k));return}      // first load: no pop-ups for old alerts
  for(const {o,k} of now){if(seen.has(k))continue;seen.add(k);
    try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){const x=noticeText(o);new Notification(x.title,{body:x.body,icon:'favicon-192.png?v=2',tag:k,lang:LANG,dir:RTL[LANG]?'rtl':'ltr'})}}catch(e){}}
}
function branchView(tb,v){
  if(tb==='sales')return salesView();
  if(tb==='maint')return maintView();
  if(tb==='checks')return checksView();
  {
    if(tb==='new')return newOrder();
    if(tb==='tasks')return listView(t('tab_tasks'),t('h_tasks'),v.filter(o=>(o.kind!=='return'&&o.status==='shipped')||(o.kind==='return'&&o.status==='approved')),t('e_tasks'));
    const js=S.justSent&&v.find(o=>o.id===S.justSent);
    return(js?sentCard(js):'')+listView(t('tab_mine'),t('h_mine'),filtered(v),t('e_mine'),true);
  }
}
function staffView(tb,v){
  if(S.role==='manager'&&tb==='salesAll')return salesAllView();
  if(S.role==='manager'&&tb==='maintAll')return maintAllView();
  if(tb==='sched'&&S.role==='manager')return scheduleView(v);
  if(S.role==='manager'){
    if(tb==='pending')return adminBootBox()+listView(t('t_pending'),t('h_pending'),v.filter(o=>o.status==='pending'),t('e_pending'));
    return listView(t('tab_all'),'',filtered(v),t('e_all'),true);
  }
  if(tb==='sched'&&S.role!=='branch')return scheduleView(v);
  if(tb==='prep')return listView(t('tab_prep'),t('h_prep'),v.filter(o=>o.kind!=='return'&&o.status==='approved'),t('e_prep'));
  if(tb==='incoming')return listView(t('tab_incoming'),t('h_incoming'),v.filter(o=>o.kind==='return'&&o.status==='shipped'),t('e_incoming'));
  return listView(t('tab_log'),'',filtered(v.filter(o=>o.status!=='pending')),t('e_log'),true);
}
function filtered(list){
  const f=S.filter;
  if(f==='active')return list.filter(o=>['pending','approved','shipped'].includes(o.status));
  if(f==='done')return list.filter(o=>['received','rejected','cancelled'].includes(o.status));
  return list;
}
function listView(title,hint,list,emptyMsg,withFilter){
  const fl=withFilter?`<div class="filters">${['active','done','all'].map(k=>`<button class="chip" aria-pressed="${S.filter===k}" data-act="filter" data-k="${k}">${t('f_'+k)}</button>`).join('')}</div>`:'';
  if(withFilter)S.lastList=list;
  const xb=withFilter&&list.length?`<button class="btn btn-ghost" data-act="xlsOrders">${t('xlsExport')}</button>`:'';
  return`<div class="row" style="justify-content:space-between"><div><h2>${esc(title)}</h2></div>${xb}</div>${fl}
  <div class="list" style="margin-top:${withFilter?0:14}px">${list.length?list.map(orderCard).join(''):`<div class="empty">${esc(emptyMsg)}</div>`}</div>`;
}
function scheduleView(v){
  const today=dayKey(Date.now()),tom=dayKey(Date.now()+864e5);
  const list=v.filter(isWaitingDispatch).sort((a,b)=>String(a.scheduledFor||'9999').localeCompare(String(b.scheduledFor||'9999')));
  if(!list.length)return`<h2>${t('tab_sched')}</h2><div class="empty">${esc(t('schedEmpty'))}</div>`;
  const groups=[];const add=(key,label,cls,o)=>{let g=groups.find(x=>x.key===key);if(!g){g={key,label,cls,items:[]};groups.push(g)}g.items.push(o)};
  list.forEach(o=>{const k=o.scheduledFor;
    if(!k)add('none',t('schedNone'),'',o);
    else if(k<today)add('late',t('schedLate'),'late',o);
    else if(k===today)add(k,t('rpToday')+' · '+dateLabel(k),'today',o);
    else if(k===tom)add(k,t('schedTomorrow')+' · '+dateLabel(k),'',o);
    else add(k,dateLabel(k),'',o)});
  const order=g=>g.key==='late'?0:g.key==='none'?2:1;
  groups.sort((a,b)=>order(a)-order(b));
  return`<h2>${t('tab_sched')}</h2>`+groups.map(g=>`<div class="sched-day ${g.cls}"><h3>${esc(g.label)} <small class="num">${g.items.length}</small></h3><div class="list">${g.items.map(orderCard).join('')}</div></div>`).join('');
}
function orderCard(o){
  const n=(o.lines||[]).length;
  let prog='';
  if(o.status==='approved'){const d=(o.lines||[]).filter(l=>l.checked).length;if(d)prog=`<div class="bar" title="${esc(t('preparedOf',{d,n}))}"><i style="width:${Math.round(d/n*100)}%"></i></div>`}
  const icon=o.kind==='return'?'warehouse':'branch';
  const late=lateInfo(o);
  return`<button class="oc ${o.kind==='return'?'ret':''}${late?' late':''}" data-act="open" data-id="${esc(o.id)}">
    <span style="min-width:0"><span class="t">${esc(o.branch)} <span class="tag ${o.kind==='return'?'ret':''}">${esc(kindL(o.kind))}</span></span>
      <span class="s">${esc(t('nItems',{n}))} · ${esc(when(o.createdAt))}</span>${o.scheduledFor&&isWaitingDispatch(o)?`<span class="dchip">${esc(t('deliveryOn',{d:dateLabel(o.scheduledFor)}))}</span>`:''} <span class="n">${esc(o.num||o.id)}</span>${prog}</span>
    <span class="side">${latePill(o)}<span class="pill st-${esc(o.status)}">${esc(statusL(o.status))}</span></span>
  </button>`;
}
/* ---------- Excel export ---------- */
const fmtDT=iso=>{if(!iso)return'';const x=new Date(iso);if(isNaN(x))return'';const p=n=>String(n).padStart(2,'0');return`${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`};
const nOr=v=>v==null||v===''?'':+v;
const sheetName=s=>String(s).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31)||'Sheet';
function orderRows(list){
  return{headers:[t('c_num'),t('r_branch'),t('c_kind'),t('c_status'),t('c_created'),t('c_approvedAt'),t('c_shippedAt'),t('c_receivedAt'),t('c_itemsN'),t('n_branch'),t('n_mgr'),t('n_ship'),t('n_recv')],
    rows:list.map(o=>[o.num||o.id,o.branch,kindL(o.kind),statusL(o.status),fmtDT(o.createdAt),fmtDT(o.approvedAt||o.rejectedAt||o.cancelledAt),fmtDT(o.shippedAt),fmtDT(o.receivedAt),(o.lines||[]).length,o.note||'',o.managerNote||'',o.shipNote||'',o.receiveNote||''])};
}
function lineRows(list){
  const rows=[];
  list.forEach(o=>(o.lines||[]).forEach(l=>{const i=lineInfo(l),it=ITEM[l.id];
    rows.push([o.num||o.id,o.branch,kindL(o.kind),statusL(o.status),fmtDT(o.createdAt),i.name,it?it.en:(l.en||''),it?it.sku:'',i.u,nOr(l.qty),nOr(l.stock),nOr(l.approved),nOr(l.sent),nOr(l.received),l.received!=null?Math.round((l.received-(l.sent??0))*1000)/1000:'',l.rnote||''])}));
  return{headers:[t('c_num'),t('r_branch'),t('c_kind'),t('c_status'),t('c_created'),t('c_item'),t('c_en'),'SKU',t('c_unit'),t('c_req'),t('stock'),t('approvedQ'),t('sentQ'),t('c_recv'),t('c_diff'),t('c_note')],rows};
}
/* letterhead lines from the company details (system admin page) */
function xlsLetterhead(title){
  const co=coInfo();
  const ids=[co.cr?'س.ت / C.R.: '+co.cr:'',co.vat?'الرقم الضريبي / VAT: '+co.vat:''].filter(Boolean).join('   ·   ');
  const contact=[co.addr,co.addrEn,co.phone,co.email,co.web].filter(Boolean).join('   ·   ');
  return[co.name+(co.nameEn?'  —  '+co.nameEn:''),ids,contact,(title||'')+'   —   '+dayKey(Date.now()).split('-').reverse().join('/')].filter(Boolean);
}
function makeSheet({headers,rows,name,plain}){
  const lh=plain?[]:xlsLetterhead(name),top=plain?0:lh.length+1;   // letterhead lines, then one empty row, then the table
  const ws=XLSX.utils.aoa_to_sheet(plain?[headers,...rows]:[...lh.map(x=>[x]),[],headers,...rows]);
  const last=headers.length-1;               // merge only across the table's own columns
  if(last>0)ws['!merges']=lh.map((_,r)=>({s:{r,c:0},e:{r,c:last}}));
  ws['!cols']=headers.map((h,c)=>({wch:Math.min(45,Math.max(8,String(h).length+2,...rows.map(r=>String(r[c]??'').length+2)))}));
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:top,c:0},e:{r:top+Math.max(rows.length,1),c:headers.length-1}})};
  return ws;
}
let xlsxLoading=null;
function ensureXlsx(){
  if(window.XLSX)return Promise.resolve();
  if(!xlsxLoading)xlsxLoading=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=()=>{xlsxLoading=null;rej(new Error('xlsx'))};document.head.appendChild(s)});
  return xlsxLoading;
}
async function saveXlsx(filename,sheets){
  let data;
  try{
    await ensureXlsx();
    if(!window.XLSX)throw new Error('xlsx');
    const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:!!RTL[LANG]}]};
    const used=new Set();
    sheets.forEach(s=>{let n=sheetName(s.name),k=2;while(used.has(n))n=sheetName(s.name).slice(0,28)+' '+(k++);used.add(n);XLSX.utils.book_append_sheet(wb,makeSheet(s),n)});
    data=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  }catch(e){toast(t('xlsFail'));return}
  if(dlCap){
    try{await dlCap.save({filename,data});toast(t('xlsSaved'))}
    catch(e){const c=e&&e.code;if(c==='declined')return;toast(c==='rate_limited'?t('xlsBusy'):c==='host_unavailable'||c==='unavailable'||c==='not_granted'?t('xlsHost'):t('xlsFail'))}
    return;
  }
  if(window.claude){toast(t('xlsHost'));return}
  try{const url=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(t('xlsSaved'))}catch(e){toast(t('xlsFail'))}
}
const stamp=()=>dayKey(Date.now());
function exportOrders(list,tag){
  saveXlsx(`maskob-${tag}-${stamp()}.xlsx`,[{name:t('sh_orders'),...orderRows(list)},{name:t('sh_lines'),...lineRows(list)}]);
}
function exportOneOrder(o){
  const L=lineRows([o]);
  const head=[[t('c_num'),o.num||o.id],[t('r_branch'),o.branch],[t('c_kind'),kindL(o.kind)],[t('c_status'),statusL(o.status)],[t('c_created'),fmtDT(o.createdAt)],[t('c_approvedAt'),fmtDT(o.approvedAt)],[t('c_shippedAt'),fmtDT(o.shippedAt)],[t('c_receivedAt'),fmtDT(o.receivedAt)],[t('n_branch'),o.note||''],[t('n_mgr'),o.managerNote||''],[t('n_ship'),o.shipNote||''],[t('n_recv'),o.receiveNote||'']];
  saveXlsx(`maskob-order-${String(o.num||o.id).replace(/[^\w-]/g,'')}.xlsx`,[
    {name:t('sh_lines'),headers:L.headers.slice(5),rows:L.rows.map(r=>r.slice(5))},
    {name:t('sh_summary'),headers:[t('c_metric'),t('c_value')],rows:head}]);
}
function exportReport(day){
  const R=buildReport(day),c=R.counts;
  const sum=[[t('st_new'),c.new],[t('st_appr'),c.appr],[t('st_ship'),c.ship],[t('st_recv'),c.recv],[t('st_rej'),c.rej],[t('st_wait'),c.wait]];
  const sheets=[{name:t('sh_summary'),headers:[t('c_metric'),t('c_value')],rows:sum},
    {name:t('rpAttn'),headers:[t('rpAttn')],rows:R.attn.length?R.attn.map(a=>[a.text]):[[t('rpAllGood')]]},
    {name:t('rpByBranch'),headers:[t('r_branch'),t('st_new'),t('st_appr'),t('st_ship'),t('st_recv'),t('st_rej')],rows:Object.keys(R.brs).map(b=>{const r=R.brs[b];return[b,r.new,r.appr,r.ship,r.recv,r.rej]})},
    {name:t('rpTop'),headers:[t('c_item'),t('c_unit'),t('c_total'),t('c_branches')],rows:R.topList.map(x=>{const i=lineInfo(x.l);return[i.name,i.u,x.q,x.b.size]})},
    {name:t('sh_lines'),...lineRows(R.dayOrders)}];
  saveXlsx(`maskob-daily-report-${day}.xlsx`,sheets);
}
function exportForecast(){
  const ready=(S.role==='branch'?[S.branch]:S.branches).map(b=>[b,forecastBranch(b)]).filter(x=>x[1].ready);
  const agg={};ready.forEach(([b,f])=>f.items.forEach(x=>{const a=agg[x.id]||(agg[x.id]={sum:0,br:0});a.sum+=x.daily*7;a.br++}));
  const ids=Object.keys(agg).sort((x,y)=>(ITEM_POS[x]??1e9)-(ITEM_POS[y]??1e9)).filter(id=>roundQty(id,agg[id].sum)>0);
  const sheets=S.role==='branch'?[]:[{name:t('c_7d'),headers:[t('c_item'),t('c_unit'),t('c_7d'),t('c_branches')],rows:ids.map(id=>{const i=lineInfo({id});return[i.name,i.u,roundQty(id,agg[id].sum),agg[id].br]})}];   // a branch exports only its own sheet
  ready.forEach(([b,f])=>sheets.push({name:b,headers:[t('c_item'),t('c_unit'),t('c_fc'),t('c_last'),t('c_trend'),t('c_conf')],rows:f.items.map(x=>{const i=lineInfo({id:x.id});return[i.name,i.u,x.f,x.last,t('tr_'+x.trend),t('cf_'+x.conf)]})}));
  saveXlsx(`maskob-forecast-${stamp()}.xlsx`,sheets);
}

/* ---------- daily report ---------- */
const dayKey=d=>{const x=new Date(d);if(isNaN(x))return'';const p=n=>String(n).padStart(2,'0');return`${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}`};
const shiftDay=(k,n)=>{const [y,m,d]=k.split('-').map(Number);return dayKey(new Date(y,m-1,d+n))};
function buildReport(day){
  const on=iso=>iso&&dayKey(iso)===day;
  const O=S.orders;
  const created=O.filter(o=>on(o.createdAt)),approved=O.filter(o=>on(o.approvedAt)&&o.status!=='rejected'),
        shipped=O.filter(o=>on(o.shippedAt)),received=O.filter(o=>on(o.receivedAt)),
        rejected=O.filter(o=>on(o.rejectedAt)||on(o.cancelledAt));
  const waiting=O.filter(o=>o.status==='pending');
  const attn=[];
  received.forEach(o=>(o.lines||[]).forEach(l=>{const s=l.sent??0;if(l.received!=null&&l.received!==s)attn.push({bad:true,text:t('rpDiff',{b:o.branch,i:lineInfo(l).name,s:fmt(s),r:fmt(l.received)})+(l.rnote?' · '+l.rnote:''),id:o.id})}));
  shipped.forEach(o=>{const n=(o.lines||[]).filter(l=>(l.sent??0)<(l.approved??l.qty)).length;if(n)attn.push({text:t('rpShort',{b:o.branch,n}),id:o.id})});
  if(day===dayKey(Date.now()))waiting.forEach(o=>{const h=Math.floor((Date.now()-Date.parse(o.createdAt))/36e5);if(h>=24)attn.push({text:h>=48?t('rpOldD',{b:o.branch,d:Math.floor(h/24)}):t('rpOld',{b:o.branch,h}),id:o.id})});
  const brs={};const bump=(list,k)=>list.forEach(o=>{const r=brs[o.branch]||(brs[o.branch]={new:0,appr:0,ship:0,recv:0,rej:0});r[k]++});
  bump(created,'new');bump(approved,'appr');bump(shipped,'ship');bump(received,'recv');bump(rejected,'rej');
  const top={};created.filter(o=>o.kind!=='return'&&o.status!=='cancelled').forEach(o=>(o.lines||[]).forEach(l=>{const r=top[l.id]||(top[l.id]={q:0,b:new Set(),l});r.q+=+l.qty||0;r.b.add(o.branch)}));
  const topList=Object.values(top).sort((a,b)=>b.q-a.q).slice(0,10);
  const ids=new Set();[created,approved,shipped,received,rejected].forEach(a=>a.forEach(o=>ids.add(o.id)));
  const dayOrders=O.filter(o=>ids.has(o.id));
  return{counts:{new:created.length,appr:approved.length,ship:shipped.length,recv:received.length,rej:rejected.length,wait:waiting.length},attn,brs,topList,dayOrders};
}
const dayLong=k=>{const [y,m,d]=k.split('-').map(Number);try{return new Date(y,m-1,d).toLocaleDateString(LOCALE[LANG],{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch(e){return k}};
function reportText(day,R){
  const c=R.counts,L=[];
  L.push(`*${t('rpTextTitle')}* · ${dayLong(day)}`);
  L.push(`${t('st_new')}: ${c.new} | ${t('st_appr')}: ${c.appr} | ${t('st_ship')}: ${c.ship} | ${t('st_recv')}: ${c.recv} | ${t('st_rej')}: ${c.rej}`);
  L.push(`${t('st_wait')}: ${c.wait}`);
  L.push('',`*${t('rpAttn')}*`);
  if(R.attn.length)R.attn.forEach(a=>L.push('• '+a.text));else L.push(t('rpAllGood'));
  const bk=Object.keys(R.brs);
  if(bk.length){L.push('',`*${t('rpByBranch')}*`);const sep=RTL[LANG]?'، ':', ';bk.forEach(b=>{const r=R.brs[b];L.push(`• ${b}: `+[['st_new',r.new],['st_appr',r.appr],['st_ship',r.ship],['st_recv',r.recv]].map(([k,v])=>`${t(k)} ${v}`).join(sep))})}
  if(R.topList.length){L.push('',`*${t('rpTop')}*`);R.topList.forEach(x=>{const i=lineInfo(x.l);L.push(`• ${i.name}: ${fmt(x.q)} ${i.u}`)})}
  return L.join('\n');
}
function reportView(){
  const today=dayKey(Date.now());
  if(!S.rpDay)S.rpDay=today;
  const day=S.rpDay,R=buildReport(day),c=R.counts;
  const stat=(k,v,hot)=>`<div class="stat ${hot?'hot':''}"><b>${v}</b><span>${t(k)}</span></div>`;
  const any=c.new+c.appr+c.ship+c.recv+c.rej>0;
  const bk=Object.keys(R.brs).sort((a,b)=>S.branches.indexOf(a)-S.branches.indexOf(b));
  const brTable=bk.length?`<div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>${t('r_branch')}</th>${['st_new','st_appr','st_ship','st_recv','st_rej'].map(k=>`<th style="text-align:center">${t(k)}</th>`).join('')}</tr></thead><tbody>${bk.map(b=>{const r=R.brs[b];return`<tr><td><b>${esc(b)}</b></td>${['new','appr','ship','recv','rej'].map(k=>`<td class="n">${r[k]||'—'}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`:'';
  const topTable=R.topList.length?`<div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>${t('c_item')}</th><th style="text-align:center">${t('c_total')}</th><th style="text-align:center">${t('c_branches')}</th></tr></thead><tbody>${R.topList.map(x=>{const i=lineInfo(x.l);return`<tr><td><b>${esc(i.name)}</b><div class="hint">${esc(i.u)}</div></td><td class="n"><b>${fmt(x.q)}</b></td><td class="n">${x.b.size}</td></tr>`}).join('')}</tbody></table></div>`:'';
  return`<div class="row" style="justify-content:space-between"><div><h2>${t('tab_report')}</h2><p class="hint">${esc(dayLong(day))}</p></div>
    <div class="row"><button class="btn btn-ghost rp-btn" data-act="xlsReport">${t('xlsExport')}</button><button class="btn btn-sun" data-act="rpCopy">${t('rpCopy')}</button></div></div>
  <div class="daybar"><button class="btn btn-ghost rp-btn" data-act="rpShift" data-n="-1">${t('rpPrev')}</button>
    <input class="field" type="date" id="rpDay" value="${esc(day)}" max="${today}">
    <button class="btn btn-ghost rp-btn" data-act="rpShift" data-n="1" ${day>=today?'disabled':''}>${t('rpNext')}</button>
    ${day!==today?`<button class="btn btn-ghost rp-btn" data-act="rpToday">${t('rpToday')}</button>`:''}</div>
  ${S.rpText?`<p class="hint" style="margin-top:10px">${esc(t('rpCopyFail'))}</p><textarea class="rp-text" id="rpText" readonly dir="auto">${esc(S.rpText)}</textarea>`:''}
  <div class="stats">${stat('st_new',c.new)}${stat('st_appr',c.appr)}${stat('st_ship',c.ship)}${stat('st_recv',c.recv)}${stat('st_rej',c.rej)}${stat('st_wait',c.wait,c.wait>0)}</div>
  <div class="rp-sec"><h3>${t('rpAttn')}</h3><div class="attn">${R.attn.length?R.attn.map(a=>`<div class="${a.bad?'bad':''}" dir="auto">${esc(a.text)}</div>`).join(''):`<div style="border-inline-start-color:var(--ok)">${t('rpAllGood')}</div>`}</div></div>
  ${any?`<div class="rp-sec"><h3>${t('rpByBranch')}</h3>${brTable}</div>`:''}
  ${topTable?`<div class="rp-sec"><h3>${t('rpTop')}</h3>${topTable}</div>`:''}
  <div class="rp-sec"><h3>${t('rpOrders')}</h3><div class="list" style="margin-top:10px">${R.dayOrders.length?R.dayOrders.map(orderCard).join(''):`<div class="empty">${t('rpEmpty')}</div>`}</div></div>`;
}
/* forecast for the signed-in branch only */
function branchForecastView(){
  const f=forecastBranch(S.branch);
  const head=`<div class="row" style="justify-content:space-between"><h2>${t('tab_fc')}</h2>${f.ready&&f.items.length?`<div class="row"><button class="btn btn-ghost rp-btn" data-act="xlsForecast">${t('xlsExport')}</button><button class="btn btn-sun" data-act="useFcGo">${t('fcUse')}</button></div>`:''}</div>`;
  if(!f.ready)return head+fcCard(f);
  if(!f.items.length)return head+`<div class="empty" style="margin-top:14px">${esc(t('fcNone'))}</div>`;
  return head+`<p class="hint" style="margin-top:8px">${esc(t('fcCycle',{n:fmt(f.cycle),d:whenDay(f.last),x:whenDay(f.next)}))}</p>
   <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>${t('c_item')}</th><th style="text-align:center">${t('c_fc')}</th><th style="text-align:center">${t('c_last')}</th><th>${t('c_trend')}</th><th>${t('c_conf')}</th></tr></thead><tbody>${f.items.map(x=>{const i=lineInfo({id:x.id});return`<tr><td><b>${esc(i.name)}</b><div class="hint">${esc(i.u)}</div></td><td class="n"><b>${fmt(x.f)}</b></td><td class="n">${fmt(x.last)}</td><td class="tr-${x.trend}">${t('tr_'+x.trend)}</td><td class="cf-${x.conf}">${t('cf_'+x.conf)}</td></tr>`}).join('')}</tbody></table></div>`;
}
function forecastView(){
  const all=S.branches.map(b=>[b,forecastBranch(b)]);
  const ready=all.filter(x=>x[1].ready),waiting=all.filter(x=>!x[1].ready);
  const wchips=waiting.length?`<div class="wchips">${waiting.map(([b,f])=>`<span class="wchip">${esc(b)} · ${esc(t('fcWaiting',{n:f.n,m:FC_MIN}))}</span>`).join('')}</div>`:'';
  if(!ready.length)return`<h2>${t('tab_fc')}</h2><div class="empty" style="margin-top:14px">${esc(t('fcNone'))}</div>${wchips}`;
  const agg={};
  ready.forEach(([b,f])=>f.items.forEach(x=>{const a=agg[x.id]||(agg[x.id]={sum:0,br:0});a.sum+=x.daily*7;a.br++}));
  const aggIds=Object.keys(agg).sort((x,y)=>(ITEM_POS[x]??1e9)-(ITEM_POS[y]??1e9)).filter(id=>roundQty(id,agg[id].sum)>0);
  const wh=`<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>${t('c_item')}</th><th style="text-align:center">${t('c_7d')}</th><th style="text-align:center">${t('c_branches')}</th></tr></thead><tbody>${aggIds.map(id=>{const i=lineInfo({id});return`<tr><td><b>${esc(i.name)}</b><div class="hint">${esc(i.u)}</div></td><td class="n"><b>${fmt(roundQty(id,agg[id].sum))}</b></td><td class="n">${agg[id].br}</td></tr>`}).join('')}</tbody></table></div>`;
  if(!S.fcBranch||!ready.some(x=>x[0]===S.fcBranch))S.fcBranch=ready[0][0];
  const f=ready.find(x=>x[0]===S.fcBranch)[1];
  const sel=`<select class="field" id="fcBranch" style="max-width:280px">${ready.map(([b])=>`<option ${b===S.fcBranch?'selected':''}>${esc(b)}</option>`).join('')}</select>`;
  const br=`<div class="row" style="margin-top:12px">${sel}</div><p class="hint" style="margin-top:8px">${esc(t('fcCycle',{n:fmt(f.cycle),d:whenDay(f.last),x:whenDay(f.next)}))}</p>
   <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>${t('c_item')}</th><th style="text-align:center">${t('c_fc')}</th><th style="text-align:center">${t('c_last')}</th><th>${t('c_trend')}</th><th>${t('c_conf')}</th></tr></thead><tbody>${f.items.map(x=>{const i=lineInfo({id:x.id});return`<tr><td><b>${esc(i.name)}</b><div class="hint">${esc(i.u)}</div></td><td class="n"><b>${fmt(x.f)}</b></td><td class="n">${fmt(x.last)}</td><td class="tr-${x.trend}">${t('tr_'+x.trend)}</td><td class="cf-${x.conf}">${t('cf_'+x.conf)}</td></tr>`}).join('')}</tbody></table></div>`;
  return`<div class="row" style="justify-content:space-between"><div><h2>${t('whTitle')}</h2></div><button class="btn btn-ghost" data-act="xlsForecast">${t('xlsExport')}</button></div>${wh}${wchips}
  <div class="fc-sec"><h2>${t('brFcTitle')}</h2>${br}</div>`;
}
/* WhatsApp notification settings (management only; sent by the server function) */
const waNorm=raw=>{let n=String(raw||'').replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(/^05\d{8}$/.test(n))n='966'+n.slice(1);return n.length>=10&&n.length<=15?n:null};
function waMessage(o){
  const n=(o.lines||[]).length;
  return ['طلب جديد من فرع '+o.branch,'النوع: '+(o.kind==='return'?'إرجاع للمستودع':'توريد للفرع'),'عدد الأصناف: '+n,'رقم الطلب: '+(o.num||o.id),'https://fllow-maskob.web.app'].join('\n');
}
function waLink(o,small){
  const num=S.contact&&S.contact.warehouseWa;if(!num||!/^[0-9]{10,15}$/.test(num))return'';
  const href='https://wa.me/'+num+'?text='+encodeURIComponent(waMessage(o));
  return'<a class="btn btn-wa'+(small?' sm':'')+'" href="'+esc(href)+'" target="_blank" rel="noopener" data-act="waOpened">'+t('waNotifyBtn')+'</a>';
}
function sentCard(o){
  return'<div class="sent-card"><div><b>'+t('t_sent')+'</b><div class="hint num" dir="ltr">'+esc(o.num||o.id)+'</div></div><div class="row">'+waLink(o)+'<button class="x" data-act="dismissSent" aria-label="'+esc(t('close'))+'">×</button></div></div>';
}
function waView(){
  const nf=S.notify||{};const on=nf.enabled!==false;
  const draft=S.waDraft!=null?S.waDraft:(nf.warehouse||[]).join('\n');
  return`<h2 style="margin-top:28px">${t('waTitle')}</h2>
  <div class="codes"><div class="code">
    <label class="row" style="gap:10px;cursor:pointer"><input type="checkbox" id="waOn" ${on?'checked':''} style="width:20px;height:20px;accent-color:var(--navy)"><b>${t('waOn')}</b></label>
    <label for="waNums" class="hint">${esc(t('waNums'))}</label>
    <textarea class="field num" id="waNums" rows="3" dir="ltr" data-in="waDraft" placeholder="05XXXXXXXX">${esc(draft)}</textarea>
    <div class="wide"><button class="btn btn-navy" data-act="waSave">${t('waSave')}</button></div>
  </div></div>`;
}
function lenView(){
  const CL=codeLenSet();
  const btn=(v,l)=>`<button class="dday${(CL===v)?' on':''}" data-act="setLen" data-n="${v||0}" aria-pressed="${CL===v}">${esc(l)}</button>`;
  let warn='';
  if(CL){const keys=['admin','manager','warehouse','hr','finance',...S.branches.map(b=>'branch:'+b)].filter(k=>hashForKey(k));
    const lens=(S.pins&&S.pins.lens)||{};
    const bad=keys.filter(k=>lens[k]!==CL).map(k=>k.startsWith('branch:')?k.slice(7):roleL(k));
    if(bad.length)warn=`<div class="len-warn">${esc(t('lenWarn',{n:CL,list:bad.join('، ')}))}</div>`}
  return`<div class="code len-box"><div class="days"><span class="hint">${t('lenLabel')}</span>${btn(null,t('lenAny'))}${btn(4,'4')}${btn(5,'5')}${btn(6,'6')}</div>${warn}</div>`;
}
function daysRow(b,i){
  const on=(S.days&&S.days[b])||[];
  return`<div class="days"><span class="hint">${t('daysLabel')}</span>${[0,1,2,3,4,5,6].map(d=>`<button class="dday${on.includes(d)?' on':''}" data-act="toggleDay" data-i="${i}" data-d="${d}" aria-pressed="${on.includes(d)}">${esc(weekdayName(d))}</button>`).join('')}</div>`;
}
function adminBootBox(){
  if(S.role!=='manager'||S.pins.admin||(S.fb&&!S.pinsReadable))return'';
  return'<div class="sent-card" style="margin-bottom:18px"><div style="flex:1;min-width:200px"><b>'+t('adminBoot')+'</b></div><div class="row" style="flex:1;min-width:240px"><input class="field" type="password" inputmode="numeric" maxlength="6" id="adminBoot" placeholder="'+esc(codePh())+'" value="'+esc(S.adminIn||'')+'" data-in="adminIn" autocomplete="new-password" style="flex:1;min-width:0;direction:ltr;text-align:center;letter-spacing:.3em"><button class="btn btn-navy" data-act="setAdmin">'+t('assign')+'</button></div></div>';
}
function branchesView(){
  const row=(key,icon,label,id,extra)=>{const set=!!hashForKey(key);return`<div class="code"><div><b>${esc(label)}</b><div class="${set?'set':'unset'}">${set?t('isSet'):t('notSet')}</div></div>
    <div class="wide"><input class="field" type="password" inputmode="numeric" maxlength="${codeLenSet()||6}" id="${id}" placeholder="${esc(codePh())}" value="${esc(S.pinIn[key]||'')}" data-in="pinIn" data-k="${esc(key)}" autocomplete="new-password"><button class="btn btn-navy" data-act="savePin" data-k="${esc(key)}">${set?t('change'):t('assign')}</button>${set&&(S.users||[]).length?`<button class="btn btn-ghost" data-act="delShared" data-k="${esc(key)}">${S.confirm==='delShared:'+key?t('us_delSharedConfirm'):t('us_delShared')}</button>`:''}${extra||''}</div></div>`};
  const codes=row('admin','manager',t('codeOf',{r:roleL('admin')}),'pin-admin')+row('manager','manager',t('codeOf',{r:roleL('manager')}),'pin-manager')+row('warehouse','warehouse',t('codeOf',{r:roleL('warehouse')}),'pin-warehouse')+row('hr','manager',t('codeOf',{r:roleL('hr')}),'pin-hr')+row('finance','manager',t('codeOf',{r:roleL('finance')}),'pin-finance');
  const brs=S.branches.map((b,i)=>{const r=row('branch:'+b,'branch',b,'pin-br-'+i,S.branches.length>1?`<button class="btn btn-bad" data-act="delBranch" data-i="${i}">${t('del')}</button>`:'');return r.slice(0,-6)+daysRow(b,i)+'</div>'}).join('');
  return`<h2>${t('codesTitle')}</h2>${lenView()}
  <div class="codes">${codes}</div>
  ${companyView()}
  ${waView()}
  <h2 style="margin-top:28px">${t('branchesTitle')}</h2>
  <div class="codes">${brs}
  <div class="row"><input class="field" style="flex:1" id="newBranch" placeholder="${esc(t('newBranchPh'))}" value="${esc(S.newBranch)}" data-in="newBranch"><button class="btn btn-navy" data-act="addBranch">${t('add')}</button></div></div>${checklistEditView()}`;
}

/* new order */
/* most requested first: how many of this branch's orders included each item (then total quantity) */
function popularity(){
  const key=S.orders.length+'|'+S.orders.map(o=>o.updatedAt||o.createdAt).join(',').length+'|'+(S.branch||'')+'|'+(S._catV||0);   // catalog version: edits rebuild the list
  if(S._popKey===key)return S._pop;
  const m={};
  S.orders.forEach(o=>{
    if(o.kind==='return'||o.status==='cancelled'||o.status==='rejected')return;
    if(S.role==='branch'&&o.branch!==S.branch)return;
    (o.lines||[]).forEach(l=>{const r=m[l.id]||(m[l.id]={n:0,q:0});r.n++;r.q+=+(l.approved??l.qty)||0});
  });
  const score=id=>m[id]||{n:0,q:0};
  const byPop=(a,b)=>{const x=score(a.id),y=score(b.id);return(y.n-x.n)||(y.q-x.q)||(ITEM_POS[a.id]-ITEM_POS[b.id])};
  const cats=CATS.map((c,i)=>({c,i,n:c.list.reduce((t,it)=>t+score(it.id).n,0),list:[...c.list].sort(byPop)}))
    .sort((a,b)=>(b.n-a.n)||(a.i-b.i));
  S._pop={cats,score};S._popKey=key;return S._pop;
}
function newOrder(){
  const d=S.draft,qq=S.q.trim(),q=qq.toLowerCase();
  const fc=d.kind==='supply'?forecastBranch(S.branch):null;
  if(fc)fcAutoFill(fc);
  const match=it=>!q||[it.ar,it.bn,it.ur].some(s=>s&&s.includes(qq))||it.en.toLowerCase().includes(q)||it.sku.toLowerCase().includes(q);
  const pop=popularity();
  const cats=pop.cats.filter(x=>S.cat==='all'||x.c.k===S.cat).map(x=>Object.assign({},x.c,{list:x.list}));
  const chosen=Object.keys(d.lines).filter(k=>d.lines[k]>0);
  const chipCount=k=>chosen.filter(id=>ITEM[id]&&ITEM[id].cat===k).length;
  const chips=`<button class="chip" aria-pressed="${S.cat==='all'}" data-act="cat" data-k="all">${t('f_all')}</button>`+pop.cats.map(x=>x.c).map(c=>{const n=chipCount(c.k);return`<button class="chip" aria-pressed="${S.cat===c.k}" data-act="cat" data-k="${c.k}">${esc(catName(c))}${n?` <span class="c num">(${n})</span>`:''}</button>`}).join('');
  let body='';
  cats.forEach(c=>{const items=c.list.filter(match);if(!items.length)return;
    body+=`<div class="cat-h">${esc(catName(c))} <small class="num">${esc(t('nItems',{n:items.length}))}</small></div><div class="grid">${items.map(it=>tile(it,fc&&fc.map)).join('')}</div>`});
  if(!body)body=`<div class="empty">${esc(t('noMatch',{q:S.q}))}</div>`;
  return`<div class="row" style="justify-content:space-between"><div><h2>${t('tab_new')}</h2></div>
    <div class="kind" role="group" aria-label="${esc(t('kindGroup'))}"><button aria-pressed="${d.kind==='supply'}" data-act="kind" data-k="supply">${t('btnSupply')}</button><button aria-pressed="${d.kind==='return'}" data-act="kind" data-k="return">${t('btnReturn')}</button></div></div>
  ${fc?fcCard(fc):''}
  <div class="row" style="margin-top:14px"><label class="search"><input id="q" type="search" placeholder="${esc(t('searchPh'))}" value="${esc(S.q)}" data-in="q" autocomplete="off"></label></div>
  <div class="chips">${chips}</div>${body}`;
}
/* the suggested order: from the 7th approved order on, when the branch's usual ordering day comes, an empty
   cart is filled once with the forecast; the branch checks the quantities, then sends it as it is or changed.
   Emptying the cart keeps it empty until the next cycle (the next approved order). */
const fcDue=fc=>fc.ready&&fc.items.length&&Date.now()>=Date.parse(fc.next)-864e5;
function fcAutoFill(fc){
  const d=S.draft,key='mk.fcAuto.'+S.branch;
  if(!fcDue(fc)||Object.values(d.lines||{}).some(q=>q>0)||LS.get(key,null)===fc.last)return;
  fc.items.forEach(x=>{if(ITEM[x.id])d.lines[x.id]=x.f});d.fromFc=fc.last;LS.set(key,fc.last);saveDraft();
}
function fcCard(fc){
  if(fc.ready&&S.draft.fromFc===fc.last&&Object.values(S.draft.lines||{}).some(q=>q>0))
    return`<div class="fc-card fc-sug"><div class="row"><div style="flex:1;min-width:0"><b>${t('fcSugTitle')}</b><div class="hint">${esc(t('fcSugHint',{n:fc.items.length}))}</div></div><button class="btn btn-ghost" data-act="clearDraft">${t('fcSugClear')}</button></div></div>`;
  if(!fc.ready)return`<div class="fc-card muted"><div class="row"><div style="flex:1;min-width:0"><b>${t('fcTitle')}</b><div class="hint">${esc(t('fcNeed',{m:FC_MIN,n:fc.n}))}</div><div class="bar"><i style="width:${Math.round(fc.n/FC_MIN*100)}%"></i></div></div></div></div>`;
  return`<div class="fc-card"><div class="row"><div style="flex:1;min-width:0"><b>${t('fcTitle')}</b><div class="hint">${esc(t('fcReady',{n:fc.items.length,d:whenDay(fc.next)}))}</div></div><button class="btn btn-sun" data-act="useFc" ${fc.items.length?'':'disabled'}>${t('fcUse')}</button></div></div>`;
}
function tile(it,fcm){S._fcm=fcm||null;
  const q=S.draft.lines[it.id]||0;const c=CAT[it.cat];const nm=nameOf_(it);const fx=fcm&&fcm[it.id];
  return`<div class="tile ${q>0?'on':''}" data-tile="${it.id}">
    ${q>0?`<span class="q num">${fmt(q)}</span>`:''}
    <button class="tap" data-act="inc" data-id="${it.id}" aria-label="${esc(t('addOne',{x:nm}))}">
      <span class="nm">${esc(nm)}</span>
      <span class="alt" dir="auto">${esc(altOf(it))}</span>
      <span class="meta">${esc(unitL(it.uk))}${it.par!=null&&it.par>0?` · ${esc(t('par',{n:fmt(it.par)}))}`:''}${fx?` · <span class="fc-tag">${esc(t('fcExp',{n:fmt(fx.f)}))}</span>`:''}</span>
    </button>
    <div class="step"><button data-act="inc" data-id="${it.id}" aria-label="${esc(t('inc'))}">+</button><input id="d-${it.id}" inputmode="decimal" value="${q?fmt(q):''}" placeholder="0" data-in="draftQty" data-id="${it.id}" aria-label="${esc(t('qtyOf',{x:nm}))}"><button data-act="dec" data-id="${it.id}" aria-label="${esc(t('dec'))}">−</button></div>
  </div>`;
}
function patchDraft(id){
  const el=document.querySelector('[data-tile="'+id+'"]');
  if(!el||S.review||S.tab!=='new'){render();return}
  const it=ITEM[id];el.outerHTML=tile(it,S._fcm);
  document.getElementById('cart').innerHTML=cartBar();
  const chip=document.querySelector('.chip[data-act="cat"][data-k="'+it.cat+'"]');
  if(chip){const n=Object.keys(S.draft.lines).filter(k=>S.draft.lines[k]>0&&ITEM[k]&&ITEM[k].cat===it.cat).length;
    chip.innerHTML=esc(catName(CAT[it.cat]))+(n?' <span class="c num">('+n+')</span>':'')}
}
function cartBar(){
  const ids=Object.keys(S.draft.lines).filter(k=>S.draft.lines[k]>0);
  return`<div class="cartbar"><div class="wrap"><div class="sum"><b class="num">${ids.length}</b> ${S.draft.kind==='return'?t('cartSumRet'):t('cartSum')}</div>
  ${ids.length?`<button class="btn btn-ghost" style="background:rgba(255,255,255,.12);color:#fff" data-act="clearDraft">${t('clear')}</button>`:''}
  <button class="btn btn-sun" data-act="review" ${ids.length?'':'disabled'}>${t('reviewSend')}</button></div></div>`;
}

/* ---------- sheet (review / order detail) ---------- */
function sheet(){
  if(S.review)return reviewSheet();
  if(!S.open)return'';
  const o=S.orders.find(x=>x.id===S.open);if(!o)return'';
  const m=modeFor(o);const w=S.work[o.id]||initWork(o);
  const head=`<div class="sh-head"><div class="row"><div style="flex:1;min-width:0"><div class="row" style="gap:8px"><h2>${esc(o.branch)}</h2><span class="tag ${o.kind==='return'?'ret':''}">${esc(kindL(o.kind))}</span><span class="pill st-${esc(o.status)}">${esc(statusL(o.status))}</span>${latePill(o)}</div>
   <div class="hint num" dir="ltr">${esc(o.num||o.id)}</div></div>${S.role==='branch'&&['pending','approved'].includes(o.status)?waLink(o,true):''}<button class="btn btn-ghost" style="padding:7px 12px;font-size:13px" data-act="xlsOrder" data-id="${esc(o.id)}">${t('xlsExport')}</button>${schedChip(o)}${canDelete(o)?`<button class="btn btn-bad del-top" data-act="confirm" data-k="delete">${t('delOrder')}</button>`:''}<button class="x" data-act="close" aria-label="${esc(t('close'))}">×</button></div>${m==='prepare'&&S.role==='warehouse'?'':timeline(o)}</div>`;
  let body='',foot='';
  const wa=o.waNotify&&S.role==="manager"?`<p class="hint" style="margin:0 0 10px">${esc(o.waNotify.sent?t("waSent",{n:o.waNotify.sent}):t("waFail",{e:o.waNotify.error||"-"}))}</p>`:"";
  const notes0=[o.note&&['n_branch',o.note],o.managerNote&&['n_mgr',o.managerNote],o.shipNote&&['n_ship',o.shipNote],o.receiveNote&&['n_recv',o.receiveNote]].filter(Boolean).map(([h,x])=>`<div class="box"><h4>${t(h)}</h4><div dir="auto">${esc(x)}</div></div>`).join('');
  const notes=wa+notes0;
  if(m==='approve'){
    body=notes+`<div class="lines">${o.lines.map(l=>{const i=lineInfo(l),x=w.lines[l.id];return`<div class="ln ${x.approved!==l.qty?'diff':''}">${icoFor(i.cat)}<div style="min-width:0"><div class="nm">${esc(i.name)}</div><div class="sub">${t('branchReq')}: <b class="num">${fmt(l.qty)}</b> ${esc(i.u)}${l.stock!=null&&l.stock!==''?` · ${t('stock')}: <span class="num">${fmt(l.stock)}</span>`:''}${i.par?` · ${esc(t('par',{n:fmt(i.par)}))}`:''}</div></div>
      <div class="ctl">${stepper('a-'+l.id,x.approved,'appr',l.id)}</div></div>`}).join('')}</div>
      <label class="box" style="display:block;margin-top:12px"><h4>${t('n_mgr')}</h4><textarea id="mnote" rows="2" data-in="wnote" placeholder="${esc(t('optional'))}">${esc(w.note)}</textarea></label>`;
    foot=S.confirm==='reject'
      ?`<span style="flex:1">${t('rejectQ')}</span><button class="btn btn-ghost" data-act="unconfirm">${t('undo')}</button><button class="btn btn-bad" data-act="reject">${t('confirmReject')}</button>`
      :`<button class="btn btn-bad" data-act="confirm" data-k="reject">${t('reject')}</button><span class="spacer"></span><button class="btn btn-navy" data-act="approve">${o.kind==='return'?t('approveBr'):t('approveWh')}</button>`;
  }else if(m==='prepare'){
    const PL=o.lines.filter(l=>+(l.approved??l.qty)>0);      // items set to 0 at approval have nothing to prepare
    const done=PL.filter(l=>w.lines[l.id].checked).length,n=PL.length;
    body=(S.role==='warehouse'?'':notes)+`<div class="prog"><span class="num">${esc(t('preparedOf',{d:done,n}))}</span><div class="bar"><i style="width:${n?Math.round(done/n*100):0}%"></i></div></div>
    <div class="lines">${PL.map(l=>{const i=lineInfo(l),x=w.lines[l.id];const ap=l.approved??l.qty;return`<div class="ln has-chk ${x.checked?'done':''}">
      <button class="chk ${x.checked?'on':''}" data-act="check" data-id="${l.id}" aria-pressed="${x.checked}" aria-label="${esc(t('markPacked',{x:i.name}))}">✓</button>
      <div style="min-width:0"><div class="nm">${esc(i.name)}</div><div class="sub">${t('approvedQ')}: <b class="num">${fmt(ap)}</b> ${esc(i.u)}${x.sent!==ap?` · <span style="color:var(--bad)">${t('sentDiff')}</span>`:''}</div></div>
      <div class="ctl">${stepper('s-'+l.id,x.sent,'sent',l.id)}</div></div>`}).join('')}</div>
    <label class="box" style="display:block;margin-top:12px"><h4>${t('n_ship')}</h4><textarea id="snote" rows="2" data-in="wnote" placeholder="${esc(t('shipNotePh'))}">${esc(w.note)}</textarea></label>`;
    const left=n-done;
    foot=S.confirm==='ship'
      ?`<span style="flex:1">${esc(t('leftZeroQ',{n:left}))}</span><button class="btn btn-ghost" data-act="unconfirm">${t('undo')}</button><button class="btn btn-sun" data-act="ship">${t('sendAnyway')}</button>`
      :`<span class="hint" style="flex:1">${left?esc(t('leftN',{n:left})):t('allReady')}</span><button class="btn btn-sun" data-act="ship">${o.kind==='return'?t('shipToWh'):t('shipToBr')}</button>`;
  }else if(m==='receive'){
    const diffs=o.lines.filter(l=>w.lines[l.id].received!==(l.sent??0)).length;
    body=notes+`    <div class="lines">${o.lines.map(l=>{const i=lineInfo(l),x=w.lines[l.id];const sent=l.sent??0;const df=x.received!==sent;return`<div class="ln ${df?'diff':''}">
      ${icoFor(i.cat)}<div style="min-width:0"><div class="nm">${esc(i.name)}</div><div class="sub">${t('sentQ')}: <b class="num">${fmt(sent)}</b> ${esc(i.u)}${df?` · <span style="color:var(--bad);font-weight:600">${esc(t('diffN',{n:fmt(x.received-sent)}))}</span>`:''}</div></div>
      <div class="ctl">${stepper('r-'+l.id,x.received,'recv',l.id)}</div>
      <div class="wide"><input class="mini-in" id="n-${l.id}" dir="auto" placeholder="${esc(t('itemNotePh'))}" value="${esc(x.note)}" data-in="lnote" data-id="${l.id}"></div></div>`}).join('')}</div>
    <label class="box" style="display:block;margin-top:12px"><h4>${t('n_recv')}</h4><textarea id="rnote" rows="2" dir="auto" data-in="wnote" placeholder="${esc(t('recvNotePh'))}">${esc(w.note)}</textarea></label>`;
    foot=`<span class="hint" style="flex:1">${diffs?esc(t('nDiffs',{n:diffs})):t('matches')}</span><button class="btn btn-ok" data-act="receive">${t('confirmRecv')}</button>`;
  }else{
    body=schedBox(o)+notes+summaryTable(o);
    if(o.status==='pending'&&S.role==='branch'){
      foot=S.confirm==='cancel'?`<span style="flex:1">${t('cancelQ')}</span><button class="btn btn-ghost" data-act="unconfirm">${t('undo')}</button><button class="btn btn-bad" data-act="cancel">${t('confirmCancel')}</button>`
        :`<span class="hint" style="flex:1">${t('waitingApproval')}</span><button class="btn btn-bad" data-act="confirm" data-k="cancel">${t('cancelOrder')}</button>`;
    }
  }
  if(canDelete(o)&&S.confirm==='delete')foot=`<span class="del-q">${esc(t('delOrderQ'))}</span><button class="btn btn-ghost" data-act="unconfirm">${t('undo')}</button><button class="btn btn-del" data-act="deleteOrder">${t('confirmDel')}</button>`;
  return`<div class="veil" data-act="veil"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-brand"><span class="logo sm" role="img" aria-label="مسكوب MASKOB"></span></div>${head}<div class="sh-body">${body}</div>${foot?`<div class="sh-foot">${foot}</div>`:''}</div></div>`;
}
function schedChip(o){
  if(!isWaitingDispatch(o)||!(S.role==='warehouse'||S.role==='manager'))return'';
  return`<label class="btn btn-ghost sched-chip" title="${esc(t('setDate'))}"><span>${o.scheduledFor?esc(t('schedBtn'))+': '+esc(dateLabel(o.scheduledFor)):esc(t('schedSet'))}</span><input type="date" id="schedDate" value="${esc(o.scheduledFor||'')}" data-oid="${esc(o.id)}" min="${dayKey(Date.now())}" aria-label="${esc(t('setDate'))}"></label>`;
}
function schedBox(o){
  if(!isWaitingDispatch(o))return'';
  if(S.role==='warehouse'||S.role==='manager')return'';      // they use the small button in the header
  if(S.role==='warehouse'||S.role==='manager')
    return`<div class="box sched-box"><label for="schedDate"><h4>${t('setDate')}</h4></label><input class="field" type="date" id="schedDate" value="${esc(o.scheduledFor||'')}" data-oid="${esc(o.id)}" min="${dayKey(Date.now())}"></div>`;
  return o.scheduledFor?`<div class="box sched-box"><h4>${t('setDate')}</h4><b>${esc(dateLabel(o.scheduledFor))}</b></div>`:'';
}
function canDelete(o){
  if(S.role==='manager')return true;
  return S.role==='branch'&&o.branch===S.branch&&o.status==='pending';
}
function stepper(id,val,field,lid){
  return`<div class="step sm"><button data-act="wInc" data-f="${field}" data-id="${lid}" aria-label="${esc(t('inc'))}">+</button><input id="${id}" inputmode="decimal" value="${fmt(val)}" data-in="wQty" data-f="${field}" data-id="${lid}"><button data-act="wDec" data-f="${field}" data-id="${lid}" aria-label="${esc(t('dec'))}">−</button></div>`;
}
function summaryTable(o){
  const has=k=>o.lines.some(l=>l[k]!=null);
  const cols=[['qty','c_req'],has('approved')&&['approved','approvedQ'],has('sent')&&['sent','sentQ'],has('received')&&['received','c_recv']].filter(Boolean);
  return`<div class="scroll"><table class="tbl"><thead><tr><th>${t('c_item')}</th>${cols.map(c=>`<th style="text-align:center">${t(c[1])}</th>`).join('')}<th>${t('c_note')}</th></tr></thead><tbody>${o.lines.map(l=>{const i=lineInfo(l);
    const mis=l.received!=null&&l.received!==(l.sent??0);
    return`<tr><td><b>${esc(i.name)}</b><div class="hint">${esc(i.u)}</div></td>${cols.map(([k])=>`<td class="n ${k==='received'&&mis?'mis':''}">${l[k]!=null?fmt(l[k]):'—'}</td>`).join('')}<td dir="auto">${esc(l.rnote||'')}</td></tr>`}).join('')}</tbody></table></div>`;
}
function timeline(o){
  const ret=o.kind==='return';
  const steps=[
    {l:t('tl_sent'),t:o.createdAt,by:o.createdBy,done:true},
    {l:o.status==='rejected'?statusL('rejected'):o.status==='cancelled'?statusL('cancelled'):t('tl_mgr'),t:o.approvedAt||o.rejectedAt||o.cancelledAt,by:o.approvedBy,done:['approved','shipped','received'].includes(o.status),bad:o.status==='rejected'||o.status==='cancelled',cur:o.status==='pending'},
    {l:ret?t('tl_prepBr'):t('tl_prepWh'),t:o.shippedAt,by:o.shippedBy,done:['shipped','received'].includes(o.status),cur:o.status==='approved'},
    {l:ret?t('tl_recvWh'):t('tl_recvBr'),t:o.receivedAt,by:o.receivedBy,done:o.status==='received',cur:o.status==='shipped'}
  ];
  return`<div class="timeline">${steps.map(s=>`<div class="tl ${s.bad?'bad':s.done?'done':s.cur?'cur':''}"><b>${esc(s.l)}</b>${s.t?`<span class="num">${esc(when(s.t))}</span>`:s.cur?t('now'):''}${personOf(s.by)?`<div>${esc(personOf(s.by))}</div>`:''}</div>`).join('')}</div>`;
}
function reviewSheet(){
  const d=S.draft;const ids=Object.keys(d.lines).filter(k=>d.lines[k]>0&&ITEM[k]);
  const body=`<div class="lines">${ids.map(id=>{const it=ITEM[id];return`<div class="ln">${icoFor(it.cat)}<div style="min-width:0"><div class="nm">${esc(nameOf_(it))}</div><div class="sub">${esc(unitL(it.uk))}${it.par?` · ${esc(t('par',{n:fmt(it.par)}))}`:''}</div>
    <div class="row" style="gap:6px;margin-top:6px"><span class="sub">${t('stock')}</span><input class="mini-in num" style="width:80px" id="st-${id}" inputmode="decimal" value="${d.stock[id]!=null?esc(d.stock[id]):''}" placeholder="—" data-in="stock" data-id="${id}"></div></div>
    <div class="ctl"><div class="step sm"><button data-act="inc" data-id="${id}" aria-label="${esc(t('inc'))}">+</button><input id="rv-${id}" inputmode="decimal" value="${fmt(d.lines[id])}" data-in="draftQty" data-id="${id}"><button data-act="dec" data-id="${id}" aria-label="${esc(t('dec'))}">−</button></div></div></div>`}).join('')}</div>
    <label class="box" style="display:block;margin-top:12px"><h4>${t('noteForAll')}</h4><textarea id="dnote" rows="2" dir="auto" data-in="dnote" placeholder="${esc(t('optional'))}">${esc(d.note)}</textarea></label>`;
  return`<div class="veil" data-act="veil"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-brand"><span class="logo sm" role="img" aria-label="مسكوب MASKOB"></span></div>
    <div class="sh-head"><div class="row"><div style="flex:1"><h2>${d.kind==='return'?t('reviewRetT'):t('reviewT')}</h2><div class="hint">${esc(S.branch||'')} · ${esc(t('nItems',{n:ids.length}))} · ${esc(kindL(d.kind))}</div></div><button class="x" data-act="close" aria-label="${esc(t('close'))}">×</button></div></div>
    <div class="sh-body">${body}</div>
    <div class="sh-foot"><button class="btn btn-ghost" data-act="close">${t('keepPicking')}</button><span class="spacer"></span><button class="btn btn-sun" data-act="submit" ${ids.length&&!S.busy?'':'disabled'}>${t('sendApproval')}</button></div></div></div>`;
}

/* ---------- work state ---------- */
function modeFor(o){
  if(o.status==='pending'&&S.role==='manager')return'approve';
  if(o.status==='approved'&&S.role===prepRole(o))return'prepare';
  if(o.status==='shipped'&&S.role===recvRole(o))return'receive';
  return'view';
}
function initWork(o){
  const w={note:'',lines:{},status:o.status};
  (o.lines||[]).forEach(l=>{const ap=l.approved??l.qty;const sent=l.sent??ap;w.lines[l.id]={approved:ap,sent:sent,checked:!!l.checked,received:l.received??(l.sent??0),note:l.rnote||''}});
  S.work[o.id]=w;return w;
}
function curWork(){const o=S.orders.find(x=>x.id===S.open);if(!o)return null;let w=S.work[o.id];if(!w||w.status!==o.status)w=initWork(o);return{o,w}}
let progTimer=null;
function saveProgressSoon(){
  clearTimeout(progTimer);
  progTimer=setTimeout(()=>{const c=curWork();if(!c||c.o.status!=='approved')return;
    const lines=c.o.lines.map(l=>Object.assign({},l,{checked:!!c.w.lines[l.id].checked,sent:c.w.lines[l.id].sent}));
    Store.patch(c.o.id,{lines,updatedAt:nowIso()}).catch(()=>{});},700);
}

/* ---------- actions ---------- */
let toastT=null;
function toast(msg){const el=document.getElementById('toast');el.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`;clearTimeout(toastT);toastT=setTimeout(()=>el.innerHTML='',2600)}
async function guard(fn,ok){
  if(S.busy)return;S.busy=true;render();
  try{await fn();if(ok)toast(typeof ok==='function'?ok():ok)}catch(e){toast(e&&(e.code==='invalid_argument'||e.code==='permission-denied')?t('noPerm'):t('saveFail'))}
  S.busy=false;render();
}
function loginOk(r,h,br,user,name){
  if(r==='branch'){S.branch=br;LS.set('mk.branch',br)}
  S.userId=user||null;S.userName=name||null;if(name)S.me=name;
  const a=r==='branch'?{role:r,branch:br,h}:{role:r,h};if(user){a.user=user;a.name=name||''}
  S.role=r;S.realRole=null;LS.set('mk.role',r);setAuth(a);if(r==='owner')applyOwnerView();S.pad={val:'',step:'enter',first:'',err:''};S.tab=null;
  if(S.fb)Store.fbStart();else xLoadDemo();
}
function findLocal(pin){
  return(async()=>{for(const e of pinEntries()){if(await hashPin(e.key,pin)===e.h)return e}return null})();
}
async function findCode(pin){
  if(!S.fb)return findLocal(pin);
  // Firebase: the server checks the code; try each role/branch until a session is accepted
  // look the code up: codes/{hash} exists only for the role/branch the code belongs to
  // a personal account first: codes/{hash} names the account behind the code
  try{const h=await hashPin('u',pin);const s=await db.doc('codes/'+h).get();
    if(s.exists&&s.data().user){const c=s.data();const e={role:c.role,branch:c.branch||null,key:'u',h,user:c.user,name:c.name||''};
      if(await Store.fbTrySession(e.role,e.branch,e.h,e.user,e.name))return e;return null}}catch(e){}
  const keys=[['admin',null],['manager',null],['warehouse',null],['hr',null],['finance',null],...S.branches.map(b=>['branch',b])];
  const hits=await Promise.all(keys.map(async([role,branch])=>{
    const key=role==='branch'?'branch:'+branch:role;const h=await hashPin(key,pin);
    try{const s=await db.doc('codes/'+h).get();return s.exists?{role,branch,key,h}:null}catch(e){return null}
  }));
  const e=hits.find(Boolean);
  if(e&&await Store.fbTrySession(e.role,e.branch,e.h))return e;
  return null;
}
/* sign in as soon as the typed code matches: codes are 4–6 digits, so try after the 4th, 5th
   and 6th digit; a miss stays quiet while the person may still be typing, and becomes
   "wrong code" after a short pause or at the 6th digit */
let chkTimer=null,chkSeq=0;
function cancelCheck(){clearTimeout(chkTimer);chkSeq++;S.pad.checking=false}
/* fixed code length from Settings (null = flexible 4-6) */
const codeLenSet=()=>[4,5,6].includes(S.codeLen)?S.codeLen:null;
const codeOk=v=>{const L=codeLenSet();return L?new RegExp('^[0-9]{'+L+'}$').test(v):/^[0-9]{4,6}$/.test(v)};
const codeLenMsg=()=>codeLenSet()?t('codeLenN',{n:codeLenSet()}):t('codeLen');
const codePh=()=>codeLenSet()?t('newCodePhN',{n:codeLenSet()}):t('newCodePh');
function scheduleCheck(){
  clearTimeout(chkTimer);
  const L=S.pad;if(L.val.length<4)return;
  const CL=codeLenSet();
  if(CL){if(L.val.length===CL)autoCheck(true);return}   // fixed length: decide at the last digit
  autoCheck(L.val.length>=6);
  if(L.val.length<6)chkTimer=setTimeout(()=>autoCheck(true),1600);
}
function wrongCode(){
  const L=S.pad;S.fails++;L.val='';L.err=t('wrongCode');L.checking=false;
  if(S.fails>=5){S.fails=0;S.lockUntil=Date.now()+30000;setTimeout(render,30100)}
  render();
}
async function autoCheck(final){
  const L=S.pad;
  if(L.step!=='enter'||L.val.length<4||Date.now()<S.lockUntil||S.signingIn)return;
  const pin=L.val,seq=++chkSeq;
  if(L.miss===pin){if(final)wrongCode();return}      // already known not to match
  L.checking=true;render();
  const e=await findCode(pin);
  if(seq!==chkSeq||S.pad.val!==pin)return;           // the person kept typing; a newer check decides
  L.checking=false;
  if(e){S.signingIn=true;clearTimeout(chkTimer);S.fails=0;loginOk(e.role,e.h,e.branch,e.user,e.name);S.signingIn=false;render();return}
  L.miss=pin;
  if(final)wrongCode();else render();
}
/* refuse a code that starts with, or is the start of, another code (auto sign-in would stop early) */
async function overlapsOther(v,key){
  const others=pinEntries().filter(e=>e.key!==key&&e.ukey!==key);if(!others.length)return false;
  const cands=[];
  for(let n=4;n<v.length;n++)cands.push(v.slice(0,n));
  if(v.length<6)for(let a=0;a<10;a++){cands.push(v+a);if(v.length<5)for(let b=0;b<10;b++)cands.push(v+a+b)}
  for(const p of cands)for(const e of others)if(await hashPin(e.key,p)===e.h)return true;
  return false;
}
const fieldKey=f=>({appr:'approved',sent:'sent',recv:'received'}[f]);
function afterWork(f){if(f==='sent')saveProgressSoon()}
const A={
  menuOpen(){S.menuOpen=true;render()},
  menuClose(){S.menuOpen=false;render()},
  /* open or close the Reports group of the side menu */
  navGrp(el){if(el.classList.contains('in'))return;S.navRep=el.getAttribute('aria-expanded')!=='true';render()},
  tab(el){S.menuOpen=false;S.tab=el.dataset.k;LS.set('mk.tab',S.tab);S.open=null;S.openSup=null;S.openEmp=S.openContract=S.openLeave=S.openCust=S.openAdv=S.openEos=S.openLic=S.openCat=S.openLr=S.openStaff=S.openVc=S.openForm=S.openTpl=S.openUser=S.openStockRecv=S.openStock=S.openExp=S.openSi=S.openAsset=null;S.hrDraft=null;S.review=false;render();window.scrollTo(0,0)},
  logout(){if(S.fb){Store.fbSignOut();return}S.userId=null;S.userName=null;S.role=null;S.realRole=null;LS.set('mk.role',null);setAuth(null);S.open=null;S.review=false;S.pad={val:'',step:'enter',first:'',err:''};render()},
  pinKey(el){const L=S.pad;if(L.val.length>=(codeLenSet()||6)||Date.now()<S.lockUntil||S.signingIn)return;L.val+=el.dataset.k;L.err='';
    render();if(L.step==='enter')scheduleCheck()},
  pinDel(){cancelCheck();S.pad.val=S.pad.val.slice(0,-1);S.pad.err='';render()},
  pinClear(){cancelCheck();S.pad.val='';S.pad.err='';render()},
  async pinGo(){
    const L=S.pad;if(L.val.length<4||S.busy||Date.now()<S.lockUntil)return;
    if(L.step==='create'&&!codeOk(L.val)){L.err=codeLenMsg();render();return}
    if(L.step==='create'){L.first=L.val;L.val='';L.step='confirm';render();return}
    if(L.step==='confirm'){
      if(L.val!==L.first){L.step='create';L.val='';L.first='';L.err=t('mismatch');render();return}
      const h=await hashPin('manager',L.val);const p=Object.assign({},S.pins,{manager:h});
      return guard(async()=>{await Store.savePins(p);S.pins=p;
        if(S.fb){if(!await Store.fbTrySession('manager',null,h))throw{code:'invalid_argument'};
          await db.doc('codes/'+h).set({role:'manager'});
          await db.doc('config/main').set({branches:S.branches,ready:true},{merge:true})}
        loginOk('manager',h)},()=>t('mgrCodeSet'));
    }
    autoCheck(true);
  },
  async setAdmin(){
    const v=(S.adminIn||'').trim();
    if(!codeOk(v)){toast(codeLenMsg());return}
    const clash=await findLocal(v);if(clash){toast(t('codeInUse'));return}
    if(await overlapsOther(v,'admin')){toast(t('codeOverlap'));return}
    const h=await hashPin('admin',v);
    guard(async()=>{
      if(S.fb){await db.doc('codes/'+h).set({role:'admin'});await db.doc('config/pins').update({admin:h})}
      else{S.pins=Object.assign({},S.pins,{admin:h});LS.set('mk.demo.pins',S.pins)}
      S.pins=Object.assign({},S.pins,{admin:h});S.adminIn='';
    },()=>t('codeSaved',{r:roleL('admin')}));
  },
  dismissSent(){S.justSent=null;render()},
  waOpened(){},
  waSave(){
    const lines=String(S.waDraft!=null?S.waDraft:(S.notify&&S.notify.warehouse||[]).join('\n')).split(/[\n,،;]+/).map(s=>s.trim()).filter(Boolean);
    const bad=lines.find(l=>!waNorm(l));if(bad){toast(t('waBad',{n:bad}));return}
    const list=[...new Set(lines.map(waNorm))];
    const on=!!(document.getElementById('waOn')||{}).checked;
    const data={enabled:on,warehouse:list,template:'maskob_new_order',lang:'ar'};
    guard(async()=>{
      if(S.fb){await db.doc('config/notify').set(data,{merge:true});await db.doc('config/contact').set({warehouseWa:list[0]||null})}
      else{LS.set('mk.demo.notify',data);LS.set('mk.demo.contact',{warehouseWa:list[0]||null})}
      S.contact={warehouseWa:list[0]||null};
      S.notify=data;S.waDraft=null;
    },()=>t('waSaved'));
  },
  async savePin(el){
    const key=el.dataset.k;const v=(S.pinIn[key]||'').trim();
    if(!codeOk(v)){toast(codeLenMsg());return}
    const clash=await findLocal(v);
    if(clash&&clash.key!==key){toast(t('codeInUse'));return}
    if(await overlapsOther(v,key)){toast(t('codeOverlap'));return}
    const h=await hashPin(key,v);const p=Object.assign({},S.pins);
    if(S.role==='admin'||!S.fb)p.lens=Object.assign({},S.pins.lens||{},{[key]:v.length});
    if(key.startsWith('branch:'))p.br=Object.assign({},S.pins.br||{},{[key.slice(7)]:h});else p[key]=h;
    const label=key.startsWith('branch:')?key.slice(7):roleL(key);
    const oldH=hashForKey(key);
    guard(async()=>{await Store.savePins(p);S.pins=p;S.pinIn[key]='';
      if(S.fb){const isBr=key.startsWith('branch:');await db.doc('codes/'+h).set(isBr?{role:'branch',branch:key.slice(7)}:{role:key});
        if(oldH&&oldH!==h)await db.doc('codes/'+oldH).delete().catch(()=>{})}
      const a=S.auth;if(a&&(a.role==='branch'?'branch:'+a.branch:a.role)===key){setAuth(Object.assign({},a,{h}));if(S.fb)await Store.fbTrySession(a.role,a.branch,h)}},()=>t('codeSaved',{r:label}));
  },
  cat(el){S.cat=el.dataset.k;render()},
  kind(el){S.draft.kind=el.dataset.k;saveDraft();render()},
  inc(el){const id=el.dataset.id;S.draft.lines[id]=Math.round(((S.draft.lines[id]||0)+1)*1000)/1000;saveDraft();S.review?render():patchDraft(id)},
  dec(el){const id=el.dataset.id;const v=Math.max(0,(S.draft.lines[id]||0)-1);if(v>0)S.draft.lines[id]=v;else delete S.draft.lines[id];saveDraft();S.review?render():patchDraft(id)},
  xlsOrders(){exportOrders(S.lastList||[],S.role==='branch'?'branch-orders':'orders')},
  xlsOrder(el){const o=S.orders.find(x=>x.id===el.dataset.id);if(o)exportOneOrder(o)},
  xlsReport(){exportReport(S.rpDay)},
  xlsForecast(){exportForecast()},
  rpShift(el){S.rpDay=shiftDay(S.rpDay,+el.dataset.n);S.rpText=null;render()},
  rpToday(){S.rpDay=dayKey(Date.now());S.rpText=null;render()},
  rpCopy(){
    const txt=reportText(S.rpDay,buildReport(S.rpDay));
    const fail=()=>{S.rpText=txt;render();const ta=document.getElementById('rpText');if(ta){ta.focus();ta.select()}};
    try{navigator.clipboard.writeText(txt).then(()=>{S.rpText=null;render();toast(t('rpCopied'))},fail)}catch(e){fail()}
  },
  useFcGo(){A.useFc();S.tab='new';LS.set('mk.tab','new');render();window.scrollTo(0,0)},
  useFc(){const fc=forecastBranch(S.branch);if(!fc.ready)return;let n=0;
    fc.items.forEach(x=>{if(ITEM[x.id]&&!(S.draft.lines[x.id]>0)){S.draft.lines[x.id]=x.f;n++}});
    S.draft.kind='supply';saveDraft();render();toast(t('fcFilled',{n}))},
  clearDraft(){S.draft={kind:S.draft.kind,lines:{},stock:{},note:''};saveDraft();render()},
  review(){S.review=true;render()},
  close(){S.imp=null;S.openSup=null;S.docImg=null;S.scanInfo=null;S.openAsset=null;S.openExp=null;S.openSi=null;S.siPay=null;S.openStockRecv=null;S.openStock=null;S.openUser=null;S.openVc=null;S.openForm=null;S.openTpl=null;S.openStaff=null;S.openLr=null;S.openCat=null;S.review=false;S.open=null;S.openMaint=null;S.openEmp=null;S.openContract=null;S.openLeave=null;S.openCust=null;S.openAdv=null;S.openEos=null;S.openLic=null;S.liFile=null;S.avPay=null;S.hrDraft=null;S.confirm=null;render()},
  veil(el,ev){if(ev.target===el)A.close()},
  filter(el){S.filter=el.dataset.k;render()},
  open(el){S.open=el.dataset.id;S.confirm=null;const o=S.orders.find(x=>x.id===S.open);if(o)initWork(o);render()},
  confirm(el){S.confirm=el.dataset.k;render()},
  unconfirm(){S.confirm=null;render()},
  submit(){
    const d=S.draft;const ids=Object.keys(d.lines).filter(k=>d.lines[k]>0&&ITEM[k]);if(!ids.length)return;
    const id=newNumber();const tm=nowIso();
    const lines=ids.map(k=>{const it=ITEM[k];const l={id:k,ar:it.ar,en:it.en,u:UNITS[it.uk]?UNITS[it.uk][0]:it.uk,cat:it.cat,qty:d.lines[k]};const st=d.stock[k];if(st!=null&&String(st).trim()!=='')l.stock=num(st);return l});
    const o={id,num:id,kind:d.kind,branch:S.branch,status:'pending',createdAt:tm,updatedAt:tm,note:d.note.trim(),lines};if(S.me)o.createdBy=S.me;
    guard(async()=>{await Store.save(o);S.draft={kind:'supply',lines:{},stock:{},note:''};saveDraft();S.review=false;S.tab='orders';S.filter='active';S.justSent=o.id},()=>t('t_sent'));
  },
  wInc(el){const c=curWork();if(!c)return;const x=c.w.lines[el.dataset.id];const f=fieldKey(el.dataset.f);x[f]=Math.round((x[f]+1)*1000)/1000;afterWork(el.dataset.f);render()},
  wDec(el){const c=curWork();if(!c)return;const x=c.w.lines[el.dataset.id];const f=fieldKey(el.dataset.f);x[f]=Math.max(0,Math.round((x[f]-1)*1000)/1000);afterWork(el.dataset.f);render()},
  check(el){const c=curWork();if(!c)return;const x=c.w.lines[el.dataset.id];x.checked=!x.checked;S.confirm=null;saveProgressSoon();render()},
  approve(){const c=curWork();if(!c)return;const{o,w}=c;const tm=nowIso();
    const lines=o.lines.map(l=>Object.assign({},l,{approved:w.lines[l.id].approved}));
    const f={status:'approved',lines,approvedAt:tm,updatedAt:tm,managerNote:w.note.trim()};if(o.kind!=='return')f.scheduledFor=nextDeliveryDay(o.branch);if(S.me)f.approvedBy=S.me;
    guard(async()=>{await Store.patch(o.id,f);S.open=null},()=>t('t_approved'));},
  reject(){const c=curWork();if(!c)return;const tm=nowIso();const f={status:'rejected',rejectedAt:tm,updatedAt:tm,managerNote:c.w.note.trim()};if(S.me)f.approvedBy=S.me;
    guard(async()=>{await Store.patch(c.o.id,f);S.open=null;S.confirm=null},()=>t('t_rejected'));},
  ackNotice(el){const id=el.dataset.id;guard(()=>Store.patch(id,{schedNotice:null}))},
  enableAlerts(){try{Notification.requestPermission().then(()=>render())}catch(e){}},
  setLen(el){const n=+el.dataset.n||null;S.codeLen=n;render();guard(()=>Store.saveCodeLen(n),()=>t('lenSaved'))},
  toggleDay(el){
    const b=S.branches[+el.dataset.i],d=+el.dataset.d;if(b==null)return;
    const days=Object.assign({},S.days||{});const cur=new Set(days[b]||[]);
    cur.has(d)?cur.delete(d):cur.add(d);days[b]=[...cur].sort((x,y)=>x-y);
    S.days=days;render();
    clearTimeout(S._daysT);S._daysT=setTimeout(()=>guard(()=>Store.saveDays(S.days),()=>t('daysSaved')),700);
  },
  deleteOrder(){const id=S.open;if(!id)return;
    guard(async()=>{await Store.remove(id);S.open=null;S.confirm=null;if(S.justSent===id)S.justSent=null},()=>t('t_deleted'))},
  cancel(){const c=curWork();if(!c)return;const tm=nowIso();guard(async()=>{await Store.patch(c.o.id,{status:'cancelled',cancelledAt:tm,updatedAt:tm});S.open=null;S.confirm=null},()=>t('t_cancelled'));},
  ship(){const c=curWork();if(!c)return;const{o,w}=c;
    const left=o.lines.filter(l=>+(l.approved??l.qty)>0&&!w.lines[l.id].checked).length;
    if(left&&S.confirm!=='ship'){S.confirm='ship';render();return}
    clearTimeout(progTimer);const tm=nowIso();
    const lines=o.lines.map(l=>{const x=w.lines[l.id];const n=Object.assign({},l,{checked:x.checked,sent:x.checked?x.sent:0});
      const c=typeof itemCost==='function'?itemCost(l.id):0;if(c>0)n.cost=c;return n});   // cost of the day, for the P&L
    const f={status:'shipped',lines,shippedAt:tm,updatedAt:tm,shipNote:w.note.trim()};if(S.me)f.shippedBy=S.me;
    guard(async()=>{await Store.patch(o.id,f);
      if(o.kind!=='return'&&window.stockApply)await stockApply(lines.filter(l=>+l.sent>0).map(l=>[l.id,-(+l.sent)]),'issue',(o.num||o.id)+' — '+o.branch).catch(()=>{});
      S.open=null;S.confirm=null},()=>t('t_shipped'));},
  receive(){const c=curWork();if(!c)return;const{o,w}=c;const tm=nowIso();
    const lines=o.lines.map(l=>{const x=w.lines[l.id];const n=Object.assign({},l,{received:x.received});if(x.note.trim())n.rnote=x.note.trim();else delete n.rnote;return n});
    const diffs=lines.filter(l=>l.received!==(l.sent??0)).length;
    const f={status:'received',lines,receivedAt:tm,updatedAt:tm,receiveNote:w.note.trim(),diffs};if(S.me)f.receivedBy=S.me;
    guard(async()=>{await Store.patch(o.id,f);
      if(o.kind==='return'&&window.stockApply)await stockApply(lines.filter(l=>+l.received>0).map(l=>[l.id,+l.received]),'return',(o.num||o.id)+' — '+o.branch).catch(()=>{});
      S.open=null},()=>diffs?t('t_recvDiff',{n:diffs}):t('t_recv'));},
  addBranch(){const n=S.newBranch.trim();if(!n||S.branches.includes(n))return;const list=[...S.branches,n];S.newBranch='';guard(()=>Store.saveBranches(list),()=>t('branchAdded'))},
  delBranch(el){const i=+el.dataset.i;const name=S.branches[i];const list=S.branches.filter((_,j)=>j!==i);
    guard(async()=>{await Store.saveBranches(list);const br=S.pins.br||{};if(name in br){const oldH=br[name];const nb=Object.assign({},br);delete nb[name];const p=Object.assign({},S.pins,{br:nb});await Store.savePins(p);S.pins=p;
      if(S.fb&&oldH)await db.doc('codes/'+oldH).delete().catch(()=>{})}},()=>t('branchDeleted'))}
};

document.addEventListener('click',ev=>{
  const sc=ev.target.closest&&ev.target.closest('.sched-chip');
  if(sc){const inp=sc.querySelector('input');if(inp&&inp.showPicker){try{inp.showPicker()}catch(e){}}return}
  const el=ev.target.closest('[data-act]');if(!el)return;
  const fn=A[el.dataset.act];if(!fn)return;
  if(el.dataset.act==='veil'){fn(el,ev);return}
  ev.stopPropagation();fn(el,ev);
});
document.addEventListener('input',ev=>{
  const el=ev.target;const k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='q'){S.q=el.value;clearTimeout(S._qT);S._qT=setTimeout(render,140);return}
  if(k==='newBranch'){S.newBranch=el.value;return}
  if(k==='waDraft'){S.waDraft=el.value;return}
  if(k==='adminIn'){el.value=el.value.replace(/[^0-9]/g,'').slice(0,6);S.adminIn=el.value;return}
  if(k==='pinIn'){el.value=el.value.replace(/\D/g,'').slice(0,6);S.pinIn[el.dataset.k]=el.value;return}
  if(k==='dnote'){S.draft.note=el.value;saveDraft();return}
  if(k==='stock'){S.draft.stock[el.dataset.id]=el.value;saveDraft();return}
  if(k==='wnote'){const c=curWork();if(c)c.w.note=el.value;return}
  if(k==='lnote'){const c=curWork();if(c)c.w.lines[el.dataset.id].note=el.value;return}
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.id==='schedDate'){const id=el.dataset.oid,v=el.value;const o=S.orders.find(x=>x.id===id);
    if(id&&o&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&v!==o.scheduledFor){const tm=nowIso();
      guard(()=>Store.patch(id,{scheduledFor:v,updatedAt:tm,schedNotice:{from:o.scheduledFor||null,to:v,at:tm,by:S.role}}),()=>t('dateSaved'))}
    return}
  if(el.id==='fcBranch'){S.fcBranch=el.value;render();return}
  if(el.id==='rpDay'){if(/^\d{4}-\d{2}-\d{2}$/.test(el.value)){S.rpDay=el.value;S.rpText=null;render()}return}
  if(el.id==='langSel'){if(LANGS.includes(el.value)){LANG=el.value;LS.set('mk.lang',LANG);render()}return}
  const k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='draftQty'){const v=num(el.value);if(v>0)S.draft.lines[el.dataset.id]=v;else delete S.draft.lines[el.dataset.id];saveDraft();S.review?render():patchDraft(el.dataset.id)}
  if(k==='wQty'){const c=curWork();if(!c)return;c.w.lines[el.dataset.id][fieldKey(el.dataset.f)]=num(el.value);afterWork(el.dataset.f);render()}
});
document.addEventListener('keydown',ev=>{
  if(!S.role&&S.pinsLoaded&&!/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)){
    if(/^[0-9]$/.test(ev.key)){A.pinKey({dataset:{k:ev.key}});ev.preventDefault();return}
    if(ev.key==='Backspace'){A.pinDel();ev.preventDefault();return}
    if(ev.key==='Enter'){A.pinGo();ev.preventDefault();return}
    if(ev.key==='Escape'){A.pinClear();return}
  }
  if(ev.key==='Escape'&&(S.open||S.review))A.close();
  if(ev.key==='Enter'&&ev.target.id==='newBranch')A.addBranch();
});

