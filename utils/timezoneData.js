const timezoneMapping = {
  // Mapping for EasyCron supported timezones.
  "Africa/Asmera": "Africa/Asmara",
  "Africa/Timbuktu": "Africa/Bamako",
  "America/Argentina/ComodRivadavia": "America/Argentina/Catamarca",
  "America/Atka": "America/Adak",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Ensenada": "America/Tijuana",
  "America/Fort_Wayne": "America/Indiana/Fort_Wayne",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Knox_IN": "America/Indiana/Knox",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "America/Montreal": "America/Toronto",
  "America/Nipigon": "America/Toronto",
  "America/Pangnirtung": "America/Iqaluit",
  "America/Porto_Acre": "America/Rio_Branco",
  "America/Rainy_River": "America/Winnipeg",
  "America/Rosario": "America/Argentina/Cordoba",
  "America/Santa_Isabel": "America/Tijuana",
  "America/Shiprock": "America/Denver",
  "America/Thunder_Bay": "America/Toronto",
  "America/Virgin": "America/Port_of_Spain",
  "Antarctica/South_Pole": "Antarctica/McMurdo",
  "Asia/Ashkhabad": "Asia/Ashgabat",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Chongqing": "Asia/Shanghai",
  "Asia/Chungking": "Asia/Shanghai",
  "Asia/Dacca": "Asia/Dhaka",
  "Asia/Harbin": "Asia/Shanghai",
  "Asia/Istanbul": "Europe/Istanbul",
  "Asia/Kashgar": "Asia/Urumqi",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Macao": "Asia/Macau",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Tel_Aviv": "Asia/Jerusalem",
  "Asia/Thimbu": "Asia/Thimphu",
  "Asia/Ujung_Pandang": "Asia/Makassar",
  "Asia/Ulan_Bator": "Asia/Ulaanbaatar",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Atlantic/Jan_Mayen": "Europe/Oslo",
  "Australia/ACT": "Australia/Sydney",
  "Australia/Canberra": "Australia/Sydney",
  "Australia/Currie": "Australia/Hobart",
  "Australia/LHI": "Australia/Lord_Howe",
  "Australia/NSW": "Australia/Sydney",
  "Australia/North": "Australia/Darwin",
  "Australia/Queensland": "Australia/Brisbane",
  "Australia/South": "Australia/Adelaide",
  "Australia/Tasmania": "Australia/Hobart",
  "Australia/Victoria": "Australia/Melbourne",
  "Australia/West": "Australia/Perth",
  "Australia/Yancowinna": "Australia/Broken_Hill",
  "Brazil/Acre": "America/Rio_Branco",
  "Brazil/DeNoronha": "America/Noronha",
  "Brazil/East": "America/Sao_Paulo",
  "Brazil/West": "America/Manaus",
  CET: "Europe/Paris",
  CST6CDT: "America/Chicago",
  "Canada/Atlantic": "America/Halifax",
  "Canada/Central": "America/Winnipeg",
  "Canada/Eastern": "America/Toronto",
  "Canada/Mountain": "America/Edmonton",
  "Canada/Pacific": "America/Vancouver",
  "Canada/Saskatchewan": "America/Regina",
  "Canada/Yukon": "America/Whitehorse",
  "Chile/Continental": "America/Santiago",
  "Chile/EasterIsland": "Pacific/Easter",
  Cuba: "America/Havana",
  EET: "Europe/Helsinki",
  EST: "America/Jamaica",
  EST5EDT: "America/New_York",
  Egypt: "Africa/Cairo",
  Eire: "Europe/Dublin",
  "Etc/GMT": "Etc/UTC",
  "Etc/Greenwich": "Etc/GMT",
  "Etc/UCT": "Etc/UTC",
  "Etc/Universal": "Etc/UTC",
  "Etc/Zulu": "Etc/UTC",
  "Europe/Belfast": "Europe/London",
  "Europe/Kiev": "Europe/Kyiv",
  "Europe/Nicosia": "Asia/Nicosia",
  "Europe/Tiraspol": "Europe/Chisinau",
  "Europe/Uzhgorod": "Europe/Kyiv",
  "Europe/Zaporozhye": "Europe/Kyiv",
  GB: "Europe/London",
  "GB-Eire": "Europe/London",
  GMT: "Etc/UTC",
  HST: "Pacific/Honolulu",
  Hongkong: "Asia/Hong_Kong",
  Iceland: "Atlantic/Reykjavik",
  Iran: "Asia/Tehran",
  Israel: "Asia/Jerusalem",
  Jamaica: "America/Jamaica",
  Japan: "Asia/Tokyo",
  Kwajalein: "Pacific/Kwajalein",
  Libya: "Africa/Tripoli",
  MET: "Europe/Paris",
  MST: "America/Phoenix",
  MST7MDT: "America/Denver",
  NZ: "Pacific/Auckland",
  "NZ-CHAT": "Pacific/Chatham",
  Navajo: "America/Denver",
  PRC: "Asia/Shanghai",
  PST8PDT: "America/Los_Angeles",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Johnston": "Pacific/Honolulu",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Samoa": "Pacific/Pago_Pago",
  "Pacific/Truk": "Pacific/Chuuk",
  "Pacific/Yap": "Pacific/Chuuk",
  Poland: "Europe/Warsaw",
  Portugal: "Europe/Lisbon",
  ROC: "Asia/Taipei",
  ROK: "Asia/Seoul",
  Singapore: "Asia/Singapore",
  Turkey: "Europe/Istanbul",
  UCT: "Etc/UTC",
  "US/Alaska": "America/Anchorage",
  "US/Aleutian": "America/Adak",
  "US/Arizona": "America/Phoenix",
  "US/Central": "America/Chicago",
  "US/East-Indiana": "America/Indiana/Indianapolis",
  "US/Eastern": "America/New_York",
  "US/Hawaii": "Pacific/Honolulu",
  "US/Indiana-Starke": "America/Indiana/Knox",
  "US/Michigan": "America/Detroit",
  "US/Mountain": "America/Denver",
  "US/Pacific": "America/Los_Angeles",
  "US/Samoa": "Pacific/Pago_Pago",
  UTC: "Etc/UTC",
  Universal: "Etc/UTC",
  "W-SU": "Europe/Moscow",
  WET: "Europe/Lisbon",
  Zulu: "Etc/UTC",
};

export function getLocalTimezone() {
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneMapping[localTimezone] || localTimezone;
}

const timezoneData = [
  {
    identifier: "Africa/Abidjan",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Accra",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Addis_Ababa",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Algiers",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Asmara",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Bamako",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Bangui",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Banjul",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Bissau",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Blantyre",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Brazzaville",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Bujumbura",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Cairo",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Casablanca",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Ceuta",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Conakry",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Dakar",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Dar_es_Salaam",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Djibouti",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Douala",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/El_Aaiun",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Freetown",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Gaborone",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Harare",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Johannesburg",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Juba",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Kampala",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Khartoum",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Kigali",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Kinshasa",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Lagos",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Libreville",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Lome",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Luanda",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Lubumbashi",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Lusaka",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Malabo",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Maputo",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Maseru",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Mbabane",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Mogadishu",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Monrovia",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Nairobi",
    offSet: "+03:00",
  },
  {
    identifier: "Africa/Ndjamena",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Niamey",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Nouakchott",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Ouagadougou",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Porto-Novo",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Sao_Tome",
    offSet: "+00:00",
  },
  {
    identifier: "Africa/Tripoli",
    offSet: "+02:00",
  },
  {
    identifier: "Africa/Tunis",
    offSet: "+01:00",
  },
  {
    identifier: "Africa/Windhoek",
    offSet: "+02:00",
  },
  {
    identifier: "America/Adak",
    offSet: "-10:00",
  },
  {
    identifier: "America/Anchorage",
    offSet: "-09:00",
  },
  {
    identifier: "America/Anguilla",
    offSet: "-04:00",
  },
  {
    identifier: "America/Antigua",
    offSet: "-04:00",
  },
  {
    identifier: "America/Araguaina",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Buenos_Aires",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Catamarca",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Cordoba",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Jujuy",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/La_Rioja",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Mendoza",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Rio_Gallegos",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Salta",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/San_Juan",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/San_Luis",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Tucuman",
    offSet: "-03:00",
  },
  {
    identifier: "America/Argentina/Ushuaia",
    offSet: "-03:00",
  },
  {
    identifier: "America/Aruba",
    offSet: "-04:00",
  },
  {
    identifier: "America/Asuncion",
    offSet: "-03:00",
  },
  {
    identifier: "America/Atikokan",
    offSet: "-05:00",
  },
  {
    identifier: "America/Bahia",
    offSet: "-03:00",
  },
  {
    identifier: "America/Bahia_Banderas",
    offSet: "-06:00",
  },
  {
    identifier: "America/Barbados",
    offSet: "-04:00",
  },
  {
    identifier: "America/Belem",
    offSet: "-03:00",
  },
  {
    identifier: "America/Belize",
    offSet: "-06:00",
  },
  {
    identifier: "America/Blanc-Sablon",
    offSet: "-04:00",
  },
  {
    identifier: "America/Boa_Vista",
    offSet: "-04:00",
  },
  {
    identifier: "America/Bogota",
    offSet: "-05:00",
  },
  {
    identifier: "America/Boise",
    offSet: "-07:00",
  },
  {
    identifier: "America/Cambridge_Bay",
    offSet: "-07:00",
  },
  {
    identifier: "America/Campo_Grande",
    offSet: "-04:00",
  },
  {
    identifier: "America/Cancun",
    offSet: "-05:00",
  },
  {
    identifier: "America/Caracas",
    offSet: "-04:00",
  },
  {
    identifier: "America/Cayenne",
    offSet: "-03:00",
  },
  {
    identifier: "America/Cayman",
    offSet: "-05:00",
  },
  {
    identifier: "America/Chicago",
    offSet: "-06:00",
  },
  {
    identifier: "America/Chihuahua",
    offSet: "-06:00",
  },
  {
    identifier: "America/Ciudad_Juarez",
    offSet: "-07:00",
  },
  {
    identifier: "America/Costa_Rica",
    offSet: "-06:00",
  },
  {
    identifier: "America/Creston",
    offSet: "-07:00",
  },
  {
    identifier: "America/Cuiaba",
    offSet: "-04:00",
  },
  {
    identifier: "America/Curacao",
    offSet: "-04:00",
  },
  {
    identifier: "America/Danmarkshavn",
    offSet: "+00:00",
  },
  {
    identifier: "America/Dawson",
    offSet: "-07:00",
  },
  {
    identifier: "America/Dawson_Creek",
    offSet: "-07:00",
  },
  {
    identifier: "America/Denver",
    offSet: "-07:00",
  },
  {
    identifier: "America/Detroit",
    offSet: "-05:00",
  },
  {
    identifier: "America/Dominica",
    offSet: "-04:00",
  },
  {
    identifier: "America/Edmonton",
    offSet: "-07:00",
  },
  {
    identifier: "America/Eirunepe",
    offSet: "-05:00",
  },
  {
    identifier: "America/El_Salvador",
    offSet: "-06:00",
  },
  {
    identifier: "America/Fort_Nelson",
    offSet: "-07:00",
  },
  {
    identifier: "America/Fortaleza",
    offSet: "-03:00",
  },
  {
    identifier: "America/Glace_Bay",
    offSet: "-04:00",
  },
  {
    identifier: "America/Goose_Bay",
    offSet: "-04:00",
  },
  {
    identifier: "America/Grand_Turk",
    offSet: "-05:00",
  },
  {
    identifier: "America/Grenada",
    offSet: "-04:00",
  },
  {
    identifier: "America/Guadeloupe",
    offSet: "-04:00",
  },
  {
    identifier: "America/Guatemala",
    offSet: "-06:00",
  },
  {
    identifier: "America/Guayaquil",
    offSet: "-05:00",
  },
  {
    identifier: "America/Guyana",
    offSet: "-04:00",
  },
  {
    identifier: "America/Halifax",
    offSet: "-04:00",
  },
  {
    identifier: "America/Havana",
    offSet: "-05:00",
  },
  {
    identifier: "America/Hermosillo",
    offSet: "-07:00",
  },
  {
    identifier: "America/Indiana/Indianapolis",
    offSet: "-05:00",
  },
  {
    identifier: "America/Indiana/Knox",
    offSet: "-06:00",
  },
  {
    identifier: "America/Indiana/Marengo",
    offSet: "-05:00",
  },
  {
    identifier: "America/Indiana/Petersburg",
    offSet: "-05:00",
  },
  {
    identifier: "America/Indiana/Tell_City",
    offSet: "-06:00",
  },
  {
    identifier: "America/Indiana/Vevay",
    offSet: "-05:00",
  },
  {
    identifier: "America/Indiana/Vincennes",
    offSet: "-05:00",
  },
  {
    identifier: "America/Indiana/Winamac",
    offSet: "-05:00",
  },
  {
    identifier: "America/Inuvik",
    offSet: "-07:00",
  },
  {
    identifier: "America/Iqaluit",
    offSet: "-05:00",
  },
  {
    identifier: "America/Jamaica",
    offSet: "-05:00",
  },
  {
    identifier: "America/Juneau",
    offSet: "-09:00",
  },
  {
    identifier: "America/Kentucky/Louisville",
    offSet: "-05:00",
  },
  {
    identifier: "America/Kentucky/Monticello",
    offSet: "-05:00",
  },
  {
    identifier: "America/Kralendijk",
    offSet: "-04:00",
  },
  {
    identifier: "America/La_Paz",
    offSet: "-04:00",
  },
  {
    identifier: "America/Lima",
    offSet: "-05:00",
  },
  {
    identifier: "America/Los_Angeles",
    offSet: "-08:00",
  },
  {
    identifier: "America/Lower_Princes",
    offSet: "-04:00",
  },
  {
    identifier: "America/Maceio",
    offSet: "-03:00",
  },
  {
    identifier: "America/Managua",
    offSet: "-06:00",
  },
  {
    identifier: "America/Manaus",
    offSet: "-04:00",
  },
  {
    identifier: "America/Marigot",
    offSet: "-04:00",
  },
  {
    identifier: "America/Martinique",
    offSet: "-04:00",
  },
  {
    identifier: "America/Matamoros",
    offSet: "-06:00",
  },
  {
    identifier: "America/Mazatlan",
    offSet: "-07:00",
  },
  {
    identifier: "America/Menominee",
    offSet: "-06:00",
  },
  {
    identifier: "America/Merida",
    offSet: "-06:00",
  },
  {
    identifier: "America/Metlakatla",
    offSet: "-09:00",
  },
  {
    identifier: "America/Mexico_City",
    offSet: "-06:00",
  },
  {
    identifier: "America/Miquelon",
    offSet: "-03:00",
  },
  {
    identifier: "America/Moncton",
    offSet: "-04:00",
  },
  {
    identifier: "America/Monterrey",
    offSet: "-06:00",
  },
  {
    identifier: "America/Montevideo",
    offSet: "-03:00",
  },
  {
    identifier: "America/Montserrat",
    offSet: "-04:00",
  },
  {
    identifier: "America/Nassau",
    offSet: "-05:00",
  },
  {
    identifier: "America/New_York",
    offSet: "-05:00",
  },
  {
    identifier: "America/Nome",
    offSet: "-09:00",
  },
  {
    identifier: "America/Noronha",
    offSet: "-02:00",
  },
  {
    identifier: "America/North_Dakota/Beulah",
    offSet: "-06:00",
  },
  {
    identifier: "America/North_Dakota/Center",
    offSet: "-06:00",
  },
  {
    identifier: "America/North_Dakota/New_Salem",
    offSet: "-06:00",
  },
  {
    identifier: "America/Nuuk",
    offSet: "-02:00",
  },
  {
    identifier: "America/Ojinaga",
    offSet: "-06:00",
  },
  {
    identifier: "America/Panama",
    offSet: "-05:00",
  },
  {
    identifier: "America/Paramaribo",
    offSet: "-03:00",
  },
  {
    identifier: "America/Phoenix",
    offSet: "-07:00",
  },
  {
    identifier: "America/Port-au-Prince",
    offSet: "-05:00",
  },
  {
    identifier: "America/Port_of_Spain",
    offSet: "-04:00",
  },
  {
    identifier: "America/Porto_Velho",
    offSet: "-04:00",
  },
  {
    identifier: "America/Puerto_Rico",
    offSet: "-04:00",
  },
  {
    identifier: "America/Punta_Arenas",
    offSet: "-03:00",
  },
  {
    identifier: "America/Rankin_Inlet",
    offSet: "-06:00",
  },
  {
    identifier: "America/Recife",
    offSet: "-03:00",
  },
  {
    identifier: "America/Regina",
    offSet: "-06:00",
  },
  {
    identifier: "America/Resolute",
    offSet: "-06:00",
  },
  {
    identifier: "America/Rio_Branco",
    offSet: "-05:00",
  },
  {
    identifier: "America/Santarem",
    offSet: "-03:00",
  },
  {
    identifier: "America/Santiago",
    offSet: "-03:00",
  },
  {
    identifier: "America/Santo_Domingo",
    offSet: "-04:00",
  },
  {
    identifier: "America/Sao_Paulo",
    offSet: "-03:00",
  },
  {
    identifier: "America/Scoresbysund",
    offSet: "-02:00",
  },
  {
    identifier: "America/Sitka",
    offSet: "-09:00",
  },
  {
    identifier: "America/St_Barthelemy",
    offSet: "-04:00",
  },
  {
    identifier: "America/St_Kitts",
    offSet: "-04:00",
  },
  {
    identifier: "America/St_Lucia",
    offSet: "-04:00",
  },
  {
    identifier: "America/St_Thomas",
    offSet: "-04:00",
  },
  {
    identifier: "America/St_Vincent",
    offSet: "-04:00",
  },
  {
    identifier: "America/Swift_Current",
    offSet: "-06:00",
  },
  {
    identifier: "America/Tegucigalpa",
    offSet: "-06:00",
  },
  {
    identifier: "America/Thule",
    offSet: "-04:00",
  },
  {
    identifier: "America/Tijuana",
    offSet: "-08:00",
  },
  {
    identifier: "America/Toronto",
    offSet: "-05:00",
  },
  {
    identifier: "America/Tortola",
    offSet: "-04:00",
  },
  {
    identifier: "America/Vancouver",
    offSet: "-08:00",
  },
  {
    identifier: "America/Whitehorse",
    offSet: "-07:00",
  },
  {
    identifier: "America/Winnipeg",
    offSet: "-06:00",
  },
  {
    identifier: "America/Yakutat",
    offSet: "-09:00",
  },
  {
    identifier: "Antarctica/Casey",
    offSet: "+08:00",
  },
  {
    identifier: "Antarctica/Davis",
    offSet: "+07:00",
  },
  {
    identifier: "Antarctica/DumontDUrville",
    offSet: "+10:00",
  },
  {
    identifier: "Antarctica/Macquarie",
    offSet: "+11:00",
  },
  {
    identifier: "Antarctica/Mawson",
    offSet: "+05:00",
  },
  {
    identifier: "Antarctica/McMurdo",
    offSet: "+13:00",
  },
  {
    identifier: "Antarctica/Palmer",
    offSet: "-03:00",
  },
  {
    identifier: "Antarctica/Rothera",
    offSet: "-03:00",
  },
  {
    identifier: "Antarctica/Syowa",
    offSet: "+03:00",
  },
  {
    identifier: "Antarctica/Troll",
    offSet: "+00:00",
  },
  {
    identifier: "Antarctica/Vostok",
    offSet: "+05:00",
  },
  {
    identifier: "Arctic/Longyearbyen",
    offSet: "+01:00",
  },
  {
    identifier: "Asia/Aden",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Almaty",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Amman",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Anadyr",
    offSet: "+12:00",
  },
  {
    identifier: "Asia/Aqtau",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Aqtobe",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Ashgabat",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Atyrau",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Baghdad",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Bahrain",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Baku",
    offSet: "+04:00",
  },
  {
    identifier: "Asia/Bangkok",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Barnaul",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Beirut",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Bishkek",
    offSet: "+06:00",
  },
  {
    identifier: "Asia/Brunei",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Chita",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Choibalsan",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Colombo",
    offSet: "+05:30",
  },
  {
    identifier: "Asia/Damascus",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Dhaka",
    offSet: "+06:00",
  },
  {
    identifier: "Asia/Dili",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Dubai",
    offSet: "+04:00",
  },
  {
    identifier: "Asia/Dushanbe",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Famagusta",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Gaza",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Hebron",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Ho_Chi_Minh",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Hong_Kong",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Hovd",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Irkutsk",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Jakarta",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Jayapura",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Jerusalem",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Kabul",
    offSet: "+04:30",
  },
  {
    identifier: "Asia/Kamchatka",
    offSet: "+12:00",
  },
  {
    identifier: "Asia/Karachi",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Kathmandu",
    offSet: "+05:45",
  },
  {
    identifier: "Asia/Khandyga",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Kolkata",
    offSet: "+05:30",
  },
  {
    identifier: "Asia/Krasnoyarsk",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Kuala_Lumpur",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Kuching",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Kuwait",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Macau",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Magadan",
    offSet: "+11:00",
  },
  {
    identifier: "Asia/Makassar",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Manila",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Muscat",
    offSet: "+04:00",
  },
  {
    identifier: "Asia/Nicosia",
    offSet: "+02:00",
  },
  {
    identifier: "Asia/Novokuznetsk",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Novosibirsk",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Omsk",
    offSet: "+06:00",
  },
  {
    identifier: "Asia/Oral",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Phnom_Penh",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Pontianak",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Pyongyang",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Qatar",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Qostanay",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Qyzylorda",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Riyadh",
    offSet: "+03:00",
  },
  {
    identifier: "Asia/Sakhalin",
    offSet: "+11:00",
  },
  {
    identifier: "Asia/Samarkand",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Seoul",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Shanghai",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Singapore",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Srednekolymsk",
    offSet: "+11:00",
  },
  {
    identifier: "Asia/Taipei",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Tashkent",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Tbilisi",
    offSet: "+04:00",
  },
  {
    identifier: "Asia/Tehran",
    offSet: "+03:30",
  },
  {
    identifier: "Asia/Thimphu",
    offSet: "+06:00",
  },
  {
    identifier: "Asia/Tokyo",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Tomsk",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Ulaanbaatar",
    offSet: "+08:00",
  },
  {
    identifier: "Asia/Urumqi",
    offSet: "+06:00",
  },
  {
    identifier: "Asia/Ust-Nera",
    offSet: "+10:00",
  },
  {
    identifier: "Asia/Vientiane",
    offSet: "+07:00",
  },
  {
    identifier: "Asia/Vladivostok",
    offSet: "+10:00",
  },
  {
    identifier: "Asia/Yakutsk",
    offSet: "+09:00",
  },
  {
    identifier: "Asia/Yangon",
    offSet: "+06:30",
  },
  {
    identifier: "Asia/Yekaterinburg",
    offSet: "+05:00",
  },
  {
    identifier: "Asia/Yerevan",
    offSet: "+04:00",
  },
  {
    identifier: "Atlantic/Azores",
    offSet: "-01:00",
  },
  {
    identifier: "Atlantic/Bermuda",
    offSet: "-04:00",
  },
  {
    identifier: "Atlantic/Canary",
    offSet: "+00:00",
  },
  {
    identifier: "Atlantic/Cape_Verde",
    offSet: "-01:00",
  },
  {
    identifier: "Atlantic/Faroe",
    offSet: "+00:00",
  },
  {
    identifier: "Atlantic/Madeira",
    offSet: "+00:00",
  },
  {
    identifier: "Atlantic/Reykjavik",
    offSet: "+00:00",
  },
  {
    identifier: "Atlantic/South_Georgia",
    offSet: "-02:00",
  },
  {
    identifier: "Atlantic/St_Helena",
    offSet: "+00:00",
  },
  {
    identifier: "Atlantic/Stanley",
    offSet: "-03:00",
  },
  {
    identifier: "Australia/Adelaide",
    offSet: "+10:30",
  },
  {
    identifier: "Australia/Brisbane",
    offSet: "+10:00",
  },
  {
    identifier: "Australia/Broken_Hill",
    offSet: "+10:30",
  },
  {
    identifier: "Australia/Darwin",
    offSet: "+09:30",
  },
  {
    identifier: "Australia/Eucla",
    offSet: "+08:45",
  },
  {
    identifier: "Australia/Hobart",
    offSet: "+11:00",
  },
  {
    identifier: "Australia/Lindeman",
    offSet: "+10:00",
  },
  {
    identifier: "Australia/Lord_Howe",
    offSet: "+11:00",
  },
  {
    identifier: "Australia/Melbourne",
    offSet: "+11:00",
  },
  {
    identifier: "Australia/Perth",
    offSet: "+08:00",
  },
  {
    identifier: "Australia/Sydney",
    offSet: "+11:00",
  },
  {
    identifier: "Europe/Amsterdam",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Andorra",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Astrakhan",
    offSet: "+04:00",
  },
  {
    identifier: "Europe/Athens",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Belgrade",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Berlin",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Bratislava",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Brussels",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Bucharest",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Budapest",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Busingen",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Chisinau",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Copenhagen",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Dublin",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Gibraltar",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Guernsey",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Helsinki",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Isle_of_Man",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Istanbul",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Jersey",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Kaliningrad",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Kirov",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Kyiv",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Lisbon",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Ljubljana",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/London",
    offSet: "+00:00",
  },
  {
    identifier: "Europe/Luxembourg",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Madrid",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Malta",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Mariehamn",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Minsk",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Monaco",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Moscow",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Oslo",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Paris",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Podgorica",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Prague",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Riga",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Rome",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Samara",
    offSet: "+04:00",
  },
  {
    identifier: "Europe/San_Marino",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Sarajevo",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Saratov",
    offSet: "+04:00",
  },
  {
    identifier: "Europe/Simferopol",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Skopje",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Sofia",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Stockholm",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Tallinn",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Tirane",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Ulyanovsk",
    offSet: "+04:00",
  },
  {
    identifier: "Europe/Vaduz",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Vatican",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Vienna",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Vilnius",
    offSet: "+02:00",
  },
  {
    identifier: "Europe/Volgograd",
    offSet: "+03:00",
  },
  {
    identifier: "Europe/Warsaw",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Zagreb",
    offSet: "+01:00",
  },
  {
    identifier: "Europe/Zurich",
    offSet: "+01:00",
  },
  {
    identifier: "Indian/Antananarivo",
    offSet: "+03:00",
  },
  {
    identifier: "Indian/Chagos",
    offSet: "+06:00",
  },
  {
    identifier: "Indian/Christmas",
    offSet: "+07:00",
  },
  {
    identifier: "Indian/Cocos",
    offSet: "+06:30",
  },
  {
    identifier: "Indian/Comoro",
    offSet: "+03:00",
  },
  {
    identifier: "Indian/Kerguelen",
    offSet: "+05:00",
  },
  {
    identifier: "Indian/Mahe",
    offSet: "+04:00",
  },
  {
    identifier: "Indian/Maldives",
    offSet: "+05:00",
  },
  {
    identifier: "Indian/Mauritius",
    offSet: "+04:00",
  },
  {
    identifier: "Indian/Mayotte",
    offSet: "+03:00",
  },
  {
    identifier: "Indian/Reunion",
    offSet: "+04:00",
  },
  {
    identifier: "Pacific/Apia",
    offSet: "+13:00",
  },
  {
    identifier: "Pacific/Auckland",
    offSet: "+13:00",
  },
  {
    identifier: "Pacific/Bougainville",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Chatham",
    offSet: "+13:45",
  },
  {
    identifier: "Pacific/Chuuk",
    offSet: "+10:00",
  },
  {
    identifier: "Pacific/Easter",
    offSet: "-05:00",
  },
  {
    identifier: "Pacific/Efate",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Fakaofo",
    offSet: "+13:00",
  },
  {
    identifier: "Pacific/Fiji",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Funafuti",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Galapagos",
    offSet: "-06:00",
  },
  {
    identifier: "Pacific/Gambier",
    offSet: "-09:00",
  },
  {
    identifier: "Pacific/Guadalcanal",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Guam",
    offSet: "+10:00",
  },
  {
    identifier: "Pacific/Honolulu",
    offSet: "-10:00",
  },
  {
    identifier: "Pacific/Kanton",
    offSet: "+13:00",
  },
  {
    identifier: "Pacific/Kiritimati",
    offSet: "+14:00",
  },
  {
    identifier: "Pacific/Kosrae",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Kwajalein",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Majuro",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Midway",
    offSet: "-11:00",
  },
  {
    identifier: "Pacific/Nauru",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Niue",
    offSet: "-11:00",
  },
  {
    identifier: "Pacific/Norfolk",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Noumea",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Pago_Pago",
    offSet: "-11:00",
  },
  {
    identifier: "Pacific/Palau",
    offSet: "+09:00",
  },
  {
    identifier: "Pacific/Pitcairn",
    offSet: "-08:00",
  },
  {
    identifier: "Pacific/Pohnpei",
    offSet: "+11:00",
  },
  {
    identifier: "Pacific/Port_Moresby",
    offSet: "+10:00",
  },
  {
    identifier: "Pacific/Rarotonga",
    offSet: "-10:00",
  },
  {
    identifier: "Pacific/Saipan",
    offSet: "+10:00",
  },
  {
    identifier: "Pacific/Tahiti",
    offSet: "-10:00",
  },
  {
    identifier: "Pacific/Tarawa",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Tongatapu",
    offSet: "+13:00",
  },
  {
    identifier: "Pacific/Wake",
    offSet: "+12:00",
  },
  {
    identifier: "Pacific/Wallis",
    offSet: "+12:00",
  },
];
export default timezoneData;
