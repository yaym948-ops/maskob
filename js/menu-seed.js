/* Maskob — the printed Maskob menu (2026-11), ready for operations to add in one tap to the products menu.
   Sizes: the smallest size is the price, the bigger ones are add-ons with the price difference.
   Prices include 15% VAT, as printed. One iced tea (17 SAR) is unreadable in the photo and left out. */
const MENU_SEED_CATS=['شاي مسكوب','شاي سايفون','شاي مثلج','القهوة','كرك','مشروبات ساخنة','مشروبات باردة','بيرة','فطائر مسكوب','محاصيل مسكوب'];
const MENU_SEED=(()=>{
  const cup=[{name:'ورق كبير',price:1},{name:'زجاج',price:2}];   // base: medium paper cup
  const P=(cat,name,price,addons)=>({cat,name,price,addons:addons||[]});
  return[
    ...[['نعناع',6],['حبق',6],['وزاب',6],['مكس',6],['اخضر نعناع',7],['عراقي',7]].map(([n,p])=>P('شاي مسكوب',n,p,cup)),
    P('شاي مسكوب','جالون شاي 1.5L',38),
    ...['شاي هندي','شاي سيلاني','شاي اخضر'].map(n=>P('شاي سايفون',n,12,[{name:'زجاج',price:2}])),
    P('شاي مثلج','ايس تي خوخ',18),P('شاي مثلج','ايس تي روز بيري',19),
    P('القهوة','قهوة اليوم حار',9),P('القهوة','قهوة اليوم بارد',10),
    P('كرك','كرك',8,[...cup,{name:'جالون 1.5L',price:34}]),
    P('مشروبات ساخنة','سحلب',12,cup),P('مشروبات ساخنة','فيتامين سي',9,cup),
    P('مشروبات باردة','كركديه',18),P('مشروبات باردة','لومي',16),
    P('بيرة','بيرة بطيخ',19),
    P('فطائر مسكوب','فطيرة ميكس تشيز',14),P('فطائر مسكوب','فطيرة لبنة زعتر',11),P('فطائر مسكوب','فطيرة زعتر',11),
    P('فطائر مسكوب','فطيرة مسخن',14),P('فطائر مسكوب','فطيرة سبانخ فيتا',13),P('فطائر مسكوب','عصيدة حساوي',15),
    P('محاصيل مسكوب','مج مسكوب',56),P('محاصيل مسكوب','باكيت شاي مسكوب',27)]})();
/* products of the printed menu not yet in the products list (same name in the same category) */
const menuSeedMissing=()=>MENU_SEED.filter(s=>!(S.products||[]).some(p=>p.name===s.name&&p.cat===s.cat));
async function menuSeedImport(){
  const cats=[...menuCats()];MENU_SEED_CATS.forEach(c=>{if(!cats.includes(c))cats.push(c)});
  const cfg={cats};if(S.fb)await db.doc('config/menuCats').set(cfg);else MEMSET('menuCats',cfg);S.menuCats=cfg;
  const todo=menuSeedMissing(),tm=nowIso();let i=0;
  for(const s of todo){const id='pd-'+Date.now().toString(36)+(i++).toString(36);await X.put('products',id,{name:s.name,cat:s.cat,price:s.price,img:'',addons:s.addons,updatedAt:tm})}
  return todo.length}
A.menuSeed=()=>{if(S.confirm!=='menuSeed'){S.confirm='menuSeed';render();return}
  guard(async()=>{const n=await menuSeedImport();S.confirm=null;S.mnSeedN=n},()=>t('mn_seedDone',{n:S.mnSeedN||0}))};
