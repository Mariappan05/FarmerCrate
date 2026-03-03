/**
 * recommendation.controller.js
 *
 * Priority:
 *   1. Try CatBoost ML server (farmercrate-ml.onrender.com)
 *   2. If ML server unreachable â†’ fall back to built-in static recommendations
 *      based on Tamil Nadu district â†’ soil type â†’ suitable products
 */

const axios = require('axios');

const _raw = process.env.ML_SERVER_URL || 'https://farmercrate-ml.onrender.com';
const ML_SERVER_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Static fallback data (Tamil Nadu district â†’ soil â†’ products)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Exact copy of Python's _infer_soil_type soil_map — all other districts default to 'Loamy'
const DISTRICT_SOIL = {
  Thanjavur:'Alluvial',     Thiruvarur:'Alluvial',      Nagapattinam:'Alluvial',
  Mayiladuthurai:'Alluvial', Tiruvarur:'Alluvial',
  Cuddalore:'Red Soil',     Villupuram:'Red Soil',      Tiruvannamalai:'Red Soil',
  Dharmapuri:'Red Soil',    Salem:'Red Soil',           Krishnagiri:'Red Soil',
  Madurai:'Black Soil',     Sivagangai:'Black Soil',    Virudhunagar:'Black Soil',
  Coimbatore:'Red Loamy Soil', Erode:'Red Loamy Soil', Namakkal:'Red Loamy Soil',
  Kanyakumari:'Sandy Loam',  Thoothukudi:'Sandy Loam',
  Nilgiris:'Laterite Soil', Theni:'Laterite Soil',     Dindigul:'Laterite Soil',
  // All other districts (Tenkasi, Chennai, Vellore, Ariyalur, etc.) → 'Loamy' default
};


// â”€â”€ CatBoost algorithm replication (fallback when ML server is sleeping) â”€â”€â”€â”€â”€
// Crops with explicit soil/temp conditions from agriculture_products_dataset.csv
const CROP_CONDITIONS = {
  'Sugarcane':{ conds:['Alluvial','Red Soil','Black Soil'],         tMin:20,tMax:35,tOpt:30 },
  'Banana':   { conds:['Alluvial','Red Loamy Soil','Sandy Loam'],   tMin:15,tMax:35,tOpt:27 },
  'Coconut':  { conds:['Sandy Loam','Laterite Soil','Alluvial'],    tMin:20,tMax:32,tOpt:27 },
  'Chilli':   { conds:['Red Soil','Black Soil','Loamy'],            tMin:20,tMax:30,tOpt:25 },
  'Turmeric': { conds:['Red Soil','Laterite Soil','Loamy'],         tMin:20,tMax:35,tOpt:25 },
};
const CROP_WEATHER_BUCKET = {
  'Banana':'HIGH_WATER','Sugarcane':'HIGH_WATER','Tapioca':'HIGH_WATER',
  'Coconut':'MODERATE',  'Ginger':'MODERATE',    'Turmeric':'MODERATE','Coriander':'MODERATE',
  'Chilli':'LOW',        'Garlic':'LOW',          'Tobacco':'LOW',
  'Black Pepper':'DRAINED','Cardamom':'DRAINED',  'Arecanut':'DRAINED',
  'Cashewnut':'DRAINED', 'Sweet Potato':'DRAINED',
};
const CROP_CYCLE = {
  weekly:  new Set(['Coriander','Garlic','Chilli']),
  monthly: new Set(['Ginger','Turmeric','Sweet Potato','Tobacco']),
  yearly:  new Set(['Tapioca','Sugarcane','Banana','Coconut','Arecanut','Black Pepper','Cardamom','Cashewnut']),
};
const CROP_CATEGORY = {
  'Arecanut':'Horticulture','Banana':'Horticulture','Black Pepper':'Spice',
  'Cardamom':'Spice',       'Cashewnut':'Horticulture','Chilli':'Spice',
  'Coconut':'Horticulture', 'Coriander':'Herb',        'Garlic':'Vegetable',
  'Ginger':'Spice',         'Sugarcane':'Crop',        'Sweet Potato':'Vegetable',
  'Tapioca':'Crop',         'Tobacco':'Crop',          'Turmeric':'Spice',
};
const CROP_AVG_PROD = {
  'Arecanut':841.9,'Banana':113261,'Black Pepper':96.6,'Cardamom':31.9,'Cashewnut':781.9,
  'Chilli':722.6,'Coconut':178918421,'Coriander':118,'Garlic':1463.9,'Ginger':478.3,
  'Sugarcane':490502.5,'Sweet Potato':476.9,'Tapioca':100917.4,'Tobacco':354.9,'Turmeric':4132.4,
};
const DISTRICT_WEATHER = {
  'Ariyalur':      {t:27.0,r:900},   'Chengalpattu':  {t:28.6,r:7624},
  'Chennai':       {t:28.5,r:8129},  'Coimbatore':    {t:26.5,r:6574},
  'Cuddalore':     {t:28.2,r:7665},  'Dharmapuri':    {t:27.0,r:900},
  'Dindigul':      {t:27.0,r:900},   'Erode':         {t:27.0,r:900},
  'Kallakurichi':  {t:28.5,r:6893},  'Kanchipuram':   {t:28.6,r:6968},
  'Kanyakumari':   {t:27.9,r:6354},  'Karur':         {t:27.0,r:900},
  'Krishnagiri':   {t:27.0,r:900},   'Madurai':       {t:29.3,r:6721},
  'Mayiladuthurai':{t:28.6,r:7842},  'Nagapattinam':  {t:28.5,r:8783},
  'Namakkal':      {t:27.0,r:900},   'Nilgiris':      {t:15.4,r:9324},
  'Perambalur':    {t:28.9,r:6811},  'Pudukkottai':   {t:28.9,r:6986},
  'Ramanathapuram':{t:27.0,r:900},   'Ranipet':       {t:28.4,r:6684},
  'Salem':         {t:27.9,r:5675},  'Sivagangai':    {t:29.2,r:7245},
  'Tenkasi':       {t:27.0,r:7414},  'Thanjavur':     {t:28.8,r:7539},
  'Theni':         {t:28.2,r:4973},  'Tiruvallur':    {t:29.1,r:5482},
  'Thoothukudi':   {t:28.6,r:6224},  'Tiruchirappalli':{t:29.2,r:6445},
  'Tirunelveli':   {t:27.0,r:900},   'Tirupattur':    {t:26.8,r:5669},
  'Tiruppur':      {t:27.9,r:5254},  'Tiruvannamalai':{t:28.2,r:6902},
  'Tiruvarur':     {t:28.6,r:8538},  'Vellore':       {t:27.9,r:6509},
  'Villupuram':    {t:28.7,r:7550},  'Virudhunagar':  {t:27.0,r:900},
};
const DISTRICT_PRODUCTION = {
  'Ariyalur':    {'Arecanut':9,'Banana':7044,'Cashewnut':9052,'Coconut':3500000,'Coriander':4,'Chilli':168,'Sugarcane':329437,'Sweet Potato':61,'Tapioca':8412,'Turmeric':66},
  'Chengalpattu':{'Banana':11019,'Cashewnut':79,'Coconut':10900000,'Coriander':1,'Chilli':139,'Sugarcane':72303,'Tapioca':188,'Turmeric':33},
  'Chennai':     {'Banana':315,'Cashewnut':3,'Coconut':1300000,'Chilli':1},
  'Coimbatore':  {'Arecanut':3880,'Banana':405878,'Black Pepper':32,'Cardamom':66,'Cashewnut':8,'Coconut':1425200000,'Coriander':29,'Chilli':176,'Ginger':347,'Sugarcane':42344,'Sweet Potato':19,'Tapioca':34025,'Tobacco':27,'Turmeric':1846},
  'Cuddalore':   {'Banana':314089,'Black Pepper':3,'Cashewnut':7920,'Coconut':15700000,'Coriander':2,'Chilli':205,'Sugarcane':2009847,'Sweet Potato':325,'Tapioca':120589,'Tobacco':326,'Turmeric':1609},
  'Dharmapuri':  {'Arecanut':2290,'Banana':45847,'Black Pepper':16,'Coconut':68900000,'Coriander':92,'Chilli':851,'Sugarcane':543959,'Sweet Potato':953,'Tapioca':405052,'Tobacco':26,'Turmeric':36188},
  'Dindigul':    {'Arecanut':85,'Banana':78983,'Black Pepper':478,'Cardamom':30,'Cashewnut':89,'Coconut':454800000,'Coriander':15,'Chilli':1255,'Garlic':5565,'Ginger':120,'Sugarcane':224469,'Sweet Potato':252,'Tapioca':21556,'Tobacco':685,'Turmeric':61},
  'Erode':       {'Arecanut':2985,'Banana':710750,'Black Pepper':11,'Cardamom':1,'Cashewnut':3,'Coconut':258700000,'Chilli':156,'Garlic':474,'Ginger':459,'Sugarcane':2266259,'Sweet Potato':254,'Tapioca':190318,'Tobacco':1748,'Turmeric':27821},
  'Kallakurichi':{'Arecanut':478,'Banana':21211,'Black Pepper':17,'Cashewnut':379,'Coconut':25600000,'Chilli':340,'Sugarcane':2885636,'Sweet Potato':648,'Tapioca':779691,'Turmeric':8564},
  'Kanchipuram': {'Banana':5234,'Cashewnut':19,'Coconut':4000000,'Chilli':54,'Sugarcane':59187,'Turmeric':6},
  'Kanyakumari':  {'Arecanut':112,'Banana':122363,'Black Pepper':53,'Cardamom':2,'Cashewnut':65,'Coconut':188700000,'Ginger':48,'Sugarcane':11,'Tapioca':31372},
  'Karur':       {'Arecanut':14,'Banana':122478,'Cashewnut':3,'Coconut':89500000,'Coriander':3,'Chilli':284,'Sugarcane':181736,'Sweet Potato':2021,'Tapioca':32942,'Turmeric':634},
  'Krishnagiri': {'Arecanut':15,'Banana':30381,'Cashewnut':2,'Coconut':206800000,'Coriander':29,'Chilli':373,'Ginger':48,'Sugarcane':46546,'Tapioca':6947,'Turmeric':4818},
  'Madurai':     {'Arecanut':2,'Banana':114083,'Cashewnut':36,'Coconut':252200000,'Coriander':18,'Chilli':948,'Sugarcane':115891,'Sweet Potato':192,'Tapioca':1427,'Turmeric':22},
  'Mayiladuthurai':{'Arecanut':2,'Banana':21408,'Cashewnut':215,'Coconut':11100000,'Chilli':4,'Sugarcane':46880,'Tapioca':3117,'Turmeric':6},
  'Nagapattinam':{'Banana':4171,'Cashewnut':366,'Coconut':24400000,'Chilli':13,'Sugarcane':294,'Tobacco':119},
  'Namakkal':    {'Arecanut':3650,'Banana':104401,'Black Pepper':484,'Cardamom':9,'Cashewnut':5,'Coconut':165000000,'Coriander':2,'Chilli':176,'Garlic':143,'Sugarcane':1274579,'Sweet Potato':93,'Tapioca':656937,'Tobacco':2,'Turmeric':13404},
  'Nilgiris':    {'Arecanut':392,'Banana':25068,'Black Pepper':184,'Cardamom':83,'Coconut':600000,'Garlic':4001,'Ginger':3928,'Tapioca':1352,'Turmeric':33},
  'Perambalur':  {'Arecanut':73,'Banana':10468,'Cashewnut':1,'Coconut':2900000,'Coriander':4,'Chilli':114,'Sugarcane':402764,'Tapioca':75722,'Turmeric':4186},
  'Pudukkottai': {'Arecanut':12,'Banana':131901,'Black Pepper':2,'Cashewnut':1837,'Coconut':184300000,'Chilli':162,'Garlic':6,'Sugarcane':215352,'Sweet Potato':411,'Tapioca':22006,'Turmeric':72},
  'Ramanathapuram':{'Banana':6966,'Cashewnut':31,'Coconut':66400000,'Coriander':275,'Chilli':3987,'Sugarcane':16207,'Turmeric':17},
  'Ranipet':     {'Banana':42363,'Cashewnut':3,'Coconut':14600000,'Chilli':260,'Sugarcane':133552,'Sweet Potato':64,'Tapioca':150,'Turmeric':1157},
  'Salem':       {'Arecanut':7169,'Banana':107902,'Black Pepper':280,'Cardamom':4,'Cashewnut':30,'Coconut':187500000,'Coriander':16,'Chilli':755,'Garlic':40,'Ginger':263,'Sugarcane':698179,'Sweet Potato':75,'Tapioca':538936,'Tobacco':72,'Turmeric':28810},
  'Sivagangai':  {'Banana':42150,'Cashewnut':57,'Coconut':175100000,'Chilli':1828,'Sugarcane':286140,'Sweet Potato':33,'Tapioca':3230,'Turmeric':11},
  'Tenkasi':     {'Arecanut':26,'Banana':78124,'Black Pepper':10,'Cardamom':6,'Cashewnut':83,'Coconut':107000000,'Chilli':148,'Ginger':24,'Sugarcane':160111,'Tapioca':2403},
  'Thanjavur':   {'Arecanut':20,'Banana':171137,'Black Pepper':1,'Cashewnut':944,'Coconut':820000000,'Coriander':5,'Chilli':75,'Garlic':18,'Ginger':311,'Sugarcane':443753,'Tapioca':22419,'Turmeric':94},
  'Theni':       {'Arecanut':52,'Banana':317037,'Black Pepper':42,'Cardamom':143,'Cashewnut':280,'Coconut':355800000,'Coriander':5,'Ginger':72,'Sugarcane':257492,'Sweet Potato':19,'Tapioca':3793,'Turmeric':22},
  'Tiruvallur':  {'Banana':26367,'Cashewnut':49,'Coconut':11800000,'Chilli':448,'Sugarcane':489958,'Sweet Potato':3554,'Tapioca':939,'Turmeric':83},
  'Thoothukudi': {'Banana':427569,'Cashewnut':131,'Coconut':44600000,'Coriander':655,'Chilli':5454,'Sugarcane':434,'Sweet Potato':262,'Turmeric':17},
  'Tiruchirappalli':{'Arecanut':191,'Banana':262683,'Black Pepper':5,'Cashewnut':285,'Coconut':88300000,'Coriander':4,'Chilli':295,'Sugarcane':122112,'Sweet Potato':94,'Tapioca':166685,'Turmeric':1488},
  'Tirunelveli': {'Arecanut':3,'Banana':140755,'Cardamom':10,'Cashewnut':63,'Coconut':55100000,'Coriander':1,'Chilli':58,'Sugarcane':2776,'Sweet Potato':762,'Tapioca':638,'Turmeric':28},
  'Tirupattur':  {'Arecanut':9,'Banana':27938,'Black Pepper':1,'Coconut':170800000,'Coriander':114,'Chilli':264,'Sugarcane':84066,'Sweet Potato':69,'Tapioca':1352,'Turmeric':435},
  'Tiruppur':    {'Arecanut':288,'Banana':126318,'Cashewnut':15,'Coconut':977300000,'Coriander':182,'Chilli':917,'Ginger':48,'Sugarcane':423802,'Tapioca':29930,'Tobacco':189,'Turmeric':1488},
  'Tiruvannamalai':{'Arecanut':50,'Banana':74076,'Black Pepper':23,'Cashewnut':6,'Coconut':16000000,'Coriander':10,'Chilli':3464,'Sugarcane':1719352,'Sweet Potato':1724,'Tapioca':131695,'Turmeric':2188},
  'Tiruvarur':   {'Arecanut':80,'Banana':15387,'Cashewnut':4,'Coconut':47600000,'Chilli':30,'Sugarcane':12775,'Sweet Potato':355,'Tapioca':6572,'Turmeric':22},
  'Vellore':     {'Banana':76814,'Coconut':96600000,'Coriander':13,'Chilli':390,'Ginger':72,'Sugarcane':148427,'Tapioca':338,'Turmeric':1113},
  'Villupuram':  {'Banana':21184,'Cashewnut':4516,'Coconut':26800000,'Chilli':227,'Sugarcane':1834634,'Sweet Potato':117,'Tapioca':28941,'Turmeric':28},
  'Virudhunagar':{'Arecanut':2,'Banana':52056,'Cardamom':29,'Cashewnut':7,'Coconut':143500000,'Coriander':1234,'Chilli':1273,'Sugarcane':106826,'Sweet Potato':518,'Tapioca':601},
};

// â”€â”€ Scoring functions â€” exact JS replication of catboost_algorithm.py â”€â”€â”€â”€â”€â”€â”€â”€
function _calcEnvSuit(product, soilType) {
  const c = CROP_CONDITIONS[product];
  if (!c) return 0.7;
  const s = soilType.toLowerCase();
  for (const cond of c.conds) {
    const cl = cond.toLowerCase();
    if (cl.includes(s) || s.includes(cl)) return 0.9;
  }
  return 0.4;
}
function _calcTempSuit(product, avgTemp) {
  const c = CROP_CONDITIONS[product];
  if (!c) return 0.7;
  if (avgTemp >= c.tMin && avgTemp <= c.tMax) {
    const dev    = Math.abs(avgTemp - c.tOpt);
    const maxDev = Math.max(c.tOpt - c.tMin, c.tMax - c.tOpt);
    return Math.max(1.0 - (dev / maxDev) * 0.3, 0.7);
  }
  return 0.3;
}
function _calcSoilTempSuit(product, avgTemp) {
  const c = CROP_CONDITIONS[product];
  if (!c) return 0.7;
  const soilTemp = avgTemp - 2, optS = c.tOpt - 2, minS = c.tMin - 3, maxS = c.tMax - 2;
  if (soilTemp >= minS && soilTemp <= maxS) {
    const dev    = Math.abs(soilTemp - optS);
    const maxDev = Math.max(optS - minS, maxS - optS);
    return Math.max(1.0 - (dev / maxDev) * 0.2, 0.8);
  }
  return 0.4;
}
function _calcWeatherSuit(product, rainfall) {
  const b = CROP_WEATHER_BUCKET[product] || 'GENERAL';
  if      (b === 'HIGH_WATER') return Math.min(0.5 + (rainfall / 2000) * 0.5, 1.0);
  else if (b === 'MODERATE')   return Math.min(0.6 + (rainfall / 1500) * 0.4, 1.0);
  else if (b === 'LOW')        return Math.min(0.8 + (rainfall / 3000) * 0.2, 1.0);
  else if (b === 'DRAINED')    return rainfall >= 1000 && rainfall <= 2500 ? 0.85 : (rainfall >= 600 && rainfall < 1000) ? 0.70 : 0.60;
  return Math.min(0.7 + (rainfall / 1000) * 0.3, 1.0);
}

// ── District name aliases (any variant → Google Maps canonical key) ────────────
const DISTRICT_ALIASES = {
  // Sivagangai
  'sivaganga':        'Sivagangai',     'sivagangai':         'Sivagangai',
  // Tiruvallur
  'thiruvallur':      'Tiruvallur',     'tiruvallur':         'Tiruvallur',
  // Kanyakumari
  'kanniyakumari':    'Kanyakumari',    'kanyakumari':        'Kanyakumari',
  'cape comorin':     'Kanyakumari',
  // Tirupattur
  'tirupathur':       'Tirupattur',     'tirupattur':         'Tirupattur',
  // Tiruvarur
  'thiruvarur':       'Tiruvarur',      'tiruvarur':          'Tiruvarur',
  // Thoothukudi
  'tuticorin':        'Thoothukudi',    'thoothukudi':        'Thoothukudi',
  // Tirunelveli
  'thirunelveli':     'Tirunelveli',    'tirunelveli':        'Tirunelveli',
  // Tiruchirappalli
  'trichy':           'Tiruchirappalli','tiruchirappalli':    'Tiruchirappalli',
  'tiruchirapalli':   'Tiruchirappalli','tiruchhirapalli':    'Tiruchirappalli',
  'trichinopoly':     'Tiruchirappalli',
  // Tiruppur
  'tirupur':          'Tiruppur',       'tiruppur':           'Tiruppur',
  // Tiruvannamalai
  'thiruvannamalai':  'Tiruvannamalai', 'tiruvannamalai':     'Tiruvannamalai',
  // Nagapattinam
  'nagapatnam':       'Nagapattinam',   'nagapattinam':       'Nagapattinam',
  // Mayiladuthurai
  'mayladuthurai':    'Mayiladuthurai', 'mayiladuthurai':     'Mayiladuthurai',
  // Ramanathapuram
  'ramnad':           'Ramanathapuram', 'ramanathapuram':     'Ramanathapuram',
  // Chengalpattu
  'chengalpet':       'Chengalpattu',   'chengalpattu':       'Chengalpattu',
  // Thanjavur
  'thanjore':         'Thanjavur',      'thanjavur':          'Thanjavur',
  // Nilgiris
  'nilgiris':         'Nilgiris',       'the nilgiris':       'Nilgiris',
  'ooty district':    'Nilgiris',
  // Pass-through (lower-case → exact canonical)
  'madurai':          'Madurai',        'coimbatore':         'Coimbatore',
  'salem':            'Salem',          'erode':              'Erode',
  'vellore':          'Vellore',        'villupuram':         'Villupuram',
  'ariyalur':         'Ariyalur',       'perambalur':         'Perambalur',
  'pudukkottai':      'Pudukkottai',    'dharmapuri':         'Dharmapuri',
  'dindigul':         'Dindigul',       'theni':              'Theni',
  'tenkasi':          'Tenkasi',        'karur':              'Karur',
  'namakkal':         'Namakkal',       'krishnagiri':        'Krishnagiri',
  'ranipet':          'Ranipet',        'kallakurichi':       'Kallakurichi',
  'cuddalore':        'Cuddalore',      'kanchipuram':        'Kanchipuram',
  'chennai':          'Chennai',        'virudhunagar':       'Virudhunagar',
};

const _KNOWN_DISTRICT_KEYS = new Set([
  ...Object.keys(DISTRICT_SOIL),
  ...Object.keys(DISTRICT_WEATHER),
  ...Object.keys(DISTRICT_PRODUCTION),
]);

/** Normalise a raw district string to the canonical key used in static data */
function normaliseDistrict(raw) {
  if (!raw) return raw;
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase();
  if (DISTRICT_ALIASES[key]) return DISTRICT_ALIASES[key];
  // Case-insensitive match against known keys
  for (const k of _KNOWN_DISTRICT_KEYS) {
    if (k.toLowerCase() === key) return k;
  }
  return trimmed; // return as-is (ML server may still handle it)
}

function getStaticRecommendations(district, myProductNames, period = 'weekly') {
  const canonical = normaliseDistrict(district);
  const soilType  = DISTRICT_SOIL[canonical] || 'Loamy';
  const wx        = DISTRICT_WEATHER[canonical] || { t: 27.0, r: 5000 };
  const distProd  = DISTRICT_PRODUCTION[canonical] || {};
  const cycleCrops = CROP_CYCLE[period] || CROP_CYCLE.weekly;
  const myNames    = (myProductNames || []).map((n) => n.toLowerCase().trim());
  const scored     = [];

  for (const product of Object.keys(CROP_AVG_PROD)) {
    const envSuit  = _calcEnvSuit(product, soilType);
    const tempSuit = _calcTempSuit(product, wx.t);
    const stSuit   = _calcSoilTempSuit(product, wx.t);
    const wthrSuit = _calcWeatherSuit(product, wx.r);
    if (envSuit < 0.7 || tempSuit < 0.7 || wthrSuit < 0.6) continue;

    const cropProd  = distProd[product] || 0;
    const cropAvg   = CROP_AVG_PROD[product] || 1;
    const prodRatio = cropAvg > 0 ? cropProd / cropAvg : 1.0;  // 0 production → 0.0 ratio → High Demand
    let mktStatus, mktOpp;
    if      (prodRatio > 1.3) { mktStatus = 'Oversupplied'; mktOpp = 0.7;  }
    else if (prodRatio > 1.0) { mktStatus = 'High Supply';  mktOpp = 0.85; }
    else if (prodRatio < 0.7) { mktStatus = 'High Demand';  mktOpp = 1.3;  }
    else                       { mktStatus = 'Balanced';     mktOpp = 1.0;  }

    const overall  = ((envSuit + tempSuit + stSuit + wthrSuit) / 4) * mktOpp;
    const estPrice = cropProd > 0 ? Math.round(2500 * (cropAvg / cropProd)) : 2500;
    const grade    = overall >= 0.9 ? 'Excellent' : (overall >= 0.7 ? 'Good' : 'Fair');
    scored.push({
      product, category: CROP_CATEGORY[product] || 'Crop', grade,
      overall_score:          +overall.toFixed(4),
      env_suitability:        +envSuit.toFixed(3),
      temp_suitability:       +tempSuit.toFixed(3),
      soil_temp_suitability:  +stSuit.toFixed(3),
      weather_score:          +wthrSuit.toFixed(3),
      market_status:          mktStatus,
      estimated_price_per_quintal: estPrice,
      already_posted: myNames.includes(product.toLowerCase().trim()),
    });
  }

  scored.sort((a, b) => b.overall_score - a.overall_score);
  // Return period-specific cycle crops first; supplement from others if fewer than 3
  const periodItems = scored.filter((s) =>  cycleCrops.has(s.product));
  const otherItems  = scored.filter((s) => !cycleCrops.has(s.product));
  const result = periodItems.length >= 3 ? periodItems : [...periodItems, ...otherItems];
  return result.slice(0, 10);
}
async function callMLServer(district, period = 'weekly') {
  const canonical = normaliseDistrict(district);
  const { data } = await axios.post(
    `${ML_SERVER_URL}/recommend`,
    { district: canonical, period },
    { timeout: 30000 }
  );
  return data;
}

// -------------------------------------------------------------------------- //
// Health Check
// -------------------------------------------------------------------------- //
const checkMLHealth = async (req, res) => {
  try {
    const { data, status } = await axios.get(`${ML_SERVER_URL}/health`, { timeout: 5000 });
    return res.status(status).json(data);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'ML server is unavailable',
      ml_server_url: ML_SERVER_URL,
      detail: err.message,
    });
  }
};

// -------------------------------------------------------------------------- //
// Get all districts
// -------------------------------------------------------------------------- //
const getDistricts = async (req, res) => {
  const staticDistricts = Object.keys(DISTRICT_SOIL);
  try {
    const { data } = await axios.get(`${ML_SERVER_URL}/districts`, { timeout: 10000 });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({
      success: true,
      districts: staticDistricts.sort(),
      count: staticDistricts.length,
      source: 'static_fallback',
    });
  }
};

// -------------------------------------------------------------------------- //
// POST /api/recommendations
// -------------------------------------------------------------------------- //
const getRecommendations = async (req, res) => {
  const { district: rawDistrict, category } = req.body;
  if (!rawDistrict) return res.status(400).json({ success: false, message: 'district is required' });
  const district = normaliseDistrict(rawDistrict);
  if (!_KNOWN_DISTRICT_KEYS.has(district)) {
    return res.status(404).json({
      success: false,
      message: `Recommendations are not available for "${district}". Your district is not in our recommendation system.`,
    });
  }
  try {
    const data = await callMLServer(district);
    return res.status(200).json(data);
  } catch (err) {
    console.warn('[REC] ML unreachable, static fallback:', err.message);
    const recs = getStaticRecommendations(district, []);
    const filtered = category ? recs.filter((r) => r.category === category) : recs;
    return res.status(200).json({
      success: true, district,
      soil_type: DISTRICT_SOIL[district] || 'Loamy',
      source: 'static_fallback',
      recommended_products: filtered,
      summary: { total_recommended: filtered.length },
    });
  }
};

// -------------------------------------------------------------------------- //
// GET /api/recommendations/all
// -------------------------------------------------------------------------- //
const getAllDistrictRecommendations = async (req, res) => {
  const { category } = req.query;
  try {
    const url = category
      ? `${ML_SERVER_URL}/all-recommendations?category=${encodeURIComponent(category)}`
      : `${ML_SERVER_URL}/all-recommendations`;
    const { data } = await axios.get(url, { timeout: 60000 });
    return res.status(200).json(data);
  } catch (err) {
    console.warn('[REC] ML unreachable for /all, static fallback:', err.message);
    const results = Object.keys(DISTRICT_SOIL).map((d) => ({
      district: d, soil_type: DISTRICT_SOIL[d],
      top_recommendation: getStaticRecommendations(d, [])[0] || null,
    }));
    return res.status(200).json({ success: true, count: results.length, data: results, source: 'static_fallback' });
  }
};

// -------------------------------------------------------------------------- //
// GET /api/recommendations/farmer  (JWT protected â€” farmer only)
// Tries ML server first, falls back to static if unavailable
// -------------------------------------------------------------------------- //
const getFarmerRecommendations = async (req, res) => {
  try {
    const period = ['weekly','monthly','yearly'].includes(req.query.period)
      ? req.query.period : 'weekly';
    console.log('[REC/farmer] START farmer_id:', req.user?.farmer_id, '- period:', period);

    const FarmerUser = require('../models/farmer_user.model');
    const Product    = require('../models/product.model');

    const farmer = await FarmerUser.findOne({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['farmer_id', 'name', 'district'],
    });
    console.log('[REC/farmer] Farmer found:', !!farmer, '- district:', farmer?.district);

    if (!farmer || !farmer.district) {
      return res.status(400).json({
        success: false,
        message: 'Farmer district not set. Please update your profile with your district.',
      });
    }
    const district = normaliseDistrict(farmer.district.trim());
    if (!_KNOWN_DISTRICT_KEYS.has(district)) {
      return res.status(404).json({
        success: false,
        message: `Recommendations are not available for "${district}". Your district is not in our recommendation system. Please update your profile with a valid Tamil Nadu district.`,
      });
    }

    const myProducts = await Product.findAll({
      where: { farmer_id: req.user.farmer_id },
      attributes: ['name'],
    });
    const myProductNames = myProducts.map((p) => (p.name || '').toLowerCase().trim());
    console.log('[REC/farmer] Products owned:', myProductNames.length, '- period:', period);

    let recs       = [];
    let source     = 'catboost_ml';
    let mlWeather  = null;
    let mlSoilType = null;

    try {
      console.log('[REC/farmer] Calling ML:', ML_SERVER_URL);
      const mlData = await callMLServer(district, period);
      console.log('[REC/farmer] ML success:', mlData?.success, '- count:', mlData?.recommended_products?.length);

      if (mlData?.success && Array.isArray(mlData.recommended_products)) {
        recs = mlData.recommended_products.slice(0, 10).map((item) => ({
          ...item,
          already_posted: myProductNames.includes(item.product.toLowerCase().trim()),
        }));
        mlWeather  = mlData.weather   || null;
        mlSoilType = mlData.soil_type || null;
      }
    } catch (mlErr) {
      source     = 'static_fallback';
      mlSoilType = DISTRICT_SOIL[district] || 'Loamy';
      console.warn('[REC/farmer] ML unreachable:', mlErr.message, '- static fallback - period:', period);
      recs = getStaticRecommendations(district, myProductNames, period);
    }

    console.log('[REC/farmer] Returning', recs.length, 'recs - period:', period, '- source:', source);

    return res.status(200).json({
      success: true,
      district,
      period,
      soil_type: mlSoilType,
      weather: mlWeather,
      source,
      weekly_recommendations: recs,
      recommendations: recs,
      summary: {
        district,
        period,
        total_recommended: recs.length,
        already_posted:    recs.filter((i) => i.already_posted).length,
        new_opportunities: recs.filter((i) => !i.already_posted).length,
      },
    });
  } catch (err) {
    console.error('[REC/farmer] Unexpected error:', err.message);
    console.error('[REC/farmer] Stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: err.message,
      hint: 'Check Render logs for [REC/farmer] entries',
    });
  }
};
module.exports = {
  checkMLHealth,
  getDistricts,
  getRecommendations,
  getAllDistrictRecommendations,
  getFarmerRecommendations,
};
