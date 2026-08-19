const cardData = [
    {
        type: "신용 · 후불",
        cards: [
            {
                id: "SH_S",
                name: "K-패스 신한카드",
                img: "../assets/images/card/shinhan_s.webp",
                benefits: ["대중교통 10% 할인", "간편결제 5% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "7,000원"}, {global: "10,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1225543_2207.html"
            },
            {
                id: "SH_SJ_S",
                name: "K-패스 신한카드(이응패스)",
                img: "../assets/images/card/sh_sj_s.webp",
                benefits: ["대중교통 10% 할인", "간편결제 5% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "7,000원"}, {global: "10,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1228480_2207.html"
            },
            {
                id: "SH_G_S",
                name: "K-패스 신한카드(경기패스)",
                img: "../assets/images/card/shinhan_g_s.jpg",
                benefits: ["대중교통 10% 할인", "간편결제 5% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "7,000원"}, {global: "10,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1231008_2207.html"
            },
            {
                id: "SH_GN_S",
                name: "K-패스 신한카드(경남패스)",
                img: "../assets/images/card/sh_gn_s.webp",
                benefits: ["대중교통 10% 할인", "간편결제 5% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "7,000원"}, {global: "10,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1230929_2207.html"
            },
            {
                id: "SH_M",
                name: "티머니 Pay&Go 신한카드",
                img: "../assets/images/card/shinhan_tm.webp",
                benefits: ["교통 30% 할인", "고속버스/택시 등 20% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "50만원 이상", "100만원 이상"] },
                    { type: "한도", detail: ["최대 3만 3천원"] },
                    { type: "연회비", types: [{local: "15,000원"}, {global: "18,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1216792_2207.html?empSeq=502&btnApp=dp01",
                m_url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1216792_2207.html?empSeq=502&btnApp=dp01"
            },
            {
                id: "SH_IP_S",
                name: "K-패스 신한카드(인천패스)",
                img: "../assets/images/card/sh_ip_s.webp",
                benefits: ["대중교통 10% 할인", "간편결제 5% 할인", "생활부문 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["20만원 이상 최대 4천원", "50만원 이상 최대 1만원"] },
                    { type: "연회비", types: [{local: "7,000원"}, {global: "10,000원"}] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/credit/1232508_2207.html"
            },
            {
                id: "NH_S",
                name: "농협 K-패스카드 신용",
                img: "../assets/images/card/nh_s.webp",
                benefits: ["대중교통 10% 할인", "오픈마켓·배달앱 5% 할인", "커피전문점·편의점 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 3만 3천원"] },
                    { type: "연회비", types: [{local: "13,000원"}, {visa: "15,000원"}] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010471"
            },
            {
                id: "NH_G_S",
                name: "농협 K-패스카드(경기패스)",
                img: "../assets/images/card/nh_g_s.webp",
                benefits: ["대중교통 10% 할인", "오픈마켓·배달앱 5% 할인", "커피전문점·편의점 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 3만 3천원"] },
                    { type: "연회비", types: [{local: "13,000원"}, {visa: "15,000원"}] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010528"
            },
            {
                id: "NH_GN_S",
                name: "농협 K-패스카드(경남패스)",
                img: "../assets/images/card/nh_gn_s.webp",
                benefits: ["대중교통 10% 할인", "오픈마켓·배달앱 5% 할인", "커피전문점·편의점 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 3만 3천원"] },
                    { type: "연회비", types: [{local: "13,000원"}, {visa: "15,000원"}] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010532"
            },
            {
                id: "KB_S",
                name: "KB국민 K-패스카드",
                img: "../assets/images/card/kb_s.webp",
                benefits: ["대중교통 10% 청구할인", "생활서비스 5% 청구할인", "KB Pay 이용 시 생활서비스 5% 추가할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "8,000원"}, {global: "8,000원"}] }
                ],
                url: "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?mainCC=a&cooperationcode=09321"
            },
            {
                id: "KB_G_S",
                name: "KB국민 K-패스카드(경기패스)",
                img: "../assets/images/card/kb_g_s.jpg",
                benefits: ["대중교통 10% 청구할인", "생활서비스 5% 청구할인", "KB Pay 이용 시 생활서비스 5% 추가할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "8,000원"}, {global: "8,000원"}] }
                ],
                url: "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?mainCC=a&cooperationcode=09346"
            },
            {
                id: "HN_S",
                name: "K-패스 하나 신용카드",
                img: "../assets/images/card/hana_s.webp",
                benefits: ["대중교통 10% 할인", "다이소,올리브영 10% 할인", "스타벅스,커피빈 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["50만원 이상", "100만원 이상"] },
                    { type: "한도", detail: ["최대 3만 5천원"] },
                    { type: "연회비", types: [{master: "17,000원"}] }
                ],
                url: "https://www.hanacard.co.kr/OPI41000000D.web?_frame=no&CD_PD_SEQ=17016",
                m_url: "https://m.hanacard.co.kr/MKLANDINGWM.web?url=/MKCDCM1000M.web?CD_PD_SEQ=17017"
            },
            {
                id: "WR_S",
                name: "K-패스 우리카드",
                img: "../assets/images/card/wr_s.png",
                benefits: ["대중교통 10% 할인", "전가맹점 0.3% 할인", "커피/편의점 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 2만원"] },
                    { type: "연회비", types: [{local: "15,000원"}] }
                ],
                url: "https://pc.wooricard.com/dcpc/yh1/crd/crd01/H1CRD101S02.do?cdPrdCd=102864",
                m_url: "https://m.wooricard.com/dcmw/yh1/crd/crd01/M1CRD101S02.do?recomNo=102864"
            },
            {
                id: "IM_S",
                name: "iM K-패스 카드",
                img: "../assets/images/card/imcard_s.webp",
                benefits: ["대중교통 10% 할인", "생활업종(배달앱,이동통신,편의점 등) 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 2만원"] },
                    { type: "연회비", types: [{local: "5,000원", master: "5,000원"}] }
                ],
                url: "https://mbanking.dgb.co.kr/com_ebz_mbs_00001.act?svcId=fis_ebz_sbs_41010_pddtl%2526PD_CD=40100101701075000%2526PD_NM=iM"
            },
            {
                id: "IBK_S",
                name: "IBK기업은행 K-패스(신용)",
                img: "../assets/images/card/ibk_s.webp",
                benefits: ["대중교통 특화 할인", "생활서비스 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 1만3,200원 외 주유, 놀이공원 할인"] },
                    { type: "연회비", types: [{local: "2,000원", master: "4,000원"}] }
                ],
                url: "https://cardapplication.ibk.co.kr/card/index.jsp?card_prdc_id=103105"
            },
            {
                id: "SS_S",
                name: "K-패스 삼성카드",
                img: "../assets/images/card/samsung_s.gif",
                benefits: ["대중교통 10% 할인", "카페 20% 할인", "OTT/멤버십 20% 할인, 온라인쇼핑 3% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 3만 4천원"] },
                    { type: "연회비", types: [{local: "10,000원", master: "10,000원"}] }
                ],
                url: "https://www.samsungcard.com/home/card/cardinfo/PGHPPCCCardCardinfoDetails001?code=AAP1830&alncmpC=QHKPASS&affcode=QHKPASS"
            },
            {
                id: "LT",
                name: "K-패스엔로카",
                img: "../assets/images/card/ltcard.webp",
                benefits: ["대중교통 최대 15% 할인", "생활업종 최대 15% 할인"],
                conditions: [
                    { type: "실적", detail: ["40만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["40만원 이상 10%할인", "80만원 이상 15%할인"] },
                    { type: "연회비", types: [{local: "20,000원", master: "20,000원"}] }
                ],
                url: "http://www.lottecard.co.kr/app/LPBOHAA_V100.lc?bId=96299&vtCdKndC=P15644-A15644",
                m_url: "http://m.lottecard.co.kr/spa/card/booth?bId=96299&vtCdKndC=P15644-A15644"
            },
            {
                id: "HYUNDAI",
                name: "현대카드Z work Edition2",
                img: "../assets/images/card/hd_s.webp",
                benefits: ["출퇴근 영역 10% 청구 할인 (①온라인 쇼핑몰 ②편의점 ③커피전문점 ④대중교통 ⑤도서)"],
                conditions: [
                    { type: "실적", detail: ["50만원 이상", "100만원 이상"] },
                    { type: "한도", detail: ["50만원 이상 월 6천원", "100만원 이상 월 1만원"] },
                    { type: "연회비", types: [{local: "20,000원", master: "20,000원"}] }
                ],
                url: "https://www.hyundaicard.com/cpc/cr/CPCCR0201_01.hc?cardWcd=ZWE2&eventCode=ZSE6S"
            },
            {
                id: "KJ",
                name: "K-패스그린카드v2",
                img: "../assets/images/card/kj.jpg",
                benefits: ["온라인업종 5%", "통신요금(SKT, KT, LG U+)자동이체시 5%", "버스,지하철 10%", "국내 가맹점 이용금액 0.3%"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상"] },
                    { type: "한도", detail: ["최대 1만 5천점"] },
                    { type: "연회비", types: [{local: "10,000원", master: "12,000원"}] }
                ],
                url: "https://www.kjbank.com/ib20/mnu/FPMCARD020103?ib20_wc=FPMCARD050102V10:FPMCARD050102V20&INBN_GDS_NO=CDR20230623001"
            },
            {
                id: "BARO",
                name: "BC 바로 K-패스 카드",
                img: "../assets/images/card/bcbaro.png",
                benefits: ["대중교통 15% 할인", "OTT/스트리밍 15% 할인", "이동통신요금/카페/편의점 5% 할인", "해외 3%할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상", "100만원 이상"] },
                    { type: "한도", detail: ["최대 1만원", "최대 2만원", "최대 3만원"] },
                    { type: "연회비", types: [{local: "6,000원", global: "6,000원"}] }
                ],
                url: "https://www.bccard.com/app/card/CreditCardMain.do?gdsno=103112",
                m_url: "https://app.paybooc.co.kr/ui/appLink?landingId=P0901PG002W&cardPdctCd=103112&incnChnlDv=Mobile&affiCd=A008"
            },
            {
                id: "KN",
                name: "경남은행 K-패스 카드",
                img: "../assets/images/card/kn_l_s.webp",
                benefits: ["대중교통 15% 할인", "친환경 모빌리티 10% 할인", "통신,온라인,배달,OTT,뷰티 5% 할인", "커피,편의점,병원,약국 업종 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만 6천원"] },
                    { type: "연회비", types: [{local: "8,000원", master: "10,000원"}] }
                ],
                url : "https://m.knbank.co.kr/ib20/mnu/MOWCOM010000039?FNC_PRD_NO=0000211632"
            },
            {
                id: "JB",
                name: "전북은행 K-패스 신용카드",
                img: "../assets/images/card/jb_s.webp",
                benefits: ["대중교통 10% 캐시백", "병원/약국/이동통신/편의점/커피숍/온라인 쇼핑 5% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "30만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 2만원", "최대 1만 5천원"] },
                    { type: "연회비", types: [{local: "8,000원", global: "10,000원"}] }
                ],
                url : "https://m.jbbank.co.kr/s/tcx7yS"
            }
        ]
    },
    {
        type: "체크 · 후불",
        cards: [
            {
                id: "SH_C",
                name: "K-패스 신한카드 체크",
                img: "../assets/images/card/shinhan_c.webp",
                benefits: ["대중교통 10% 할인", "간편결제 2% 할인", "생활부문 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1225544_2206.html"
            },
            {
                id: "SH_IP_C",
                name: "K-패스 신한카드(인천패스) 체크",
                img: "../assets/images/card/sh_ip_c.webp",
                benefits: ["대중교통 10% 할인", "간편결제 2% 할인", "생활부문 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["20만원 이상 최대 4천원", "50만원 이상 최대 1만원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1232509_2206.html"
            },
            {
                id: "SH_SJ_C",
                name: "K-패스 신한카드(이응패스) 체크",
                img: "../assets/images/card/sh_sj_c.webp",
                benefits: ["대중교통 10% 할인", "간편결제 2% 할인", "생활부문 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1228481_2206.html"
            },
            {
                id: "SH_G_C",
                name: "K-패스 신한카드(경기패스) 체크",
                img: "../assets/images/card/shinhan_g_c.jpg",
                benefits: ["대중교통 10% 할인", "간편결제 2% 할인", "생활부문 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1231009_2206.html"
            },
            {
                id: "SH_GN_C",
                name: "K-패스 신한카드(경남패스) 체크",
                img: "../assets/images/card/sh_gn_c.webp",
                benefits: ["대중교통 10% 할인", "간편결제 2% 할인", "생활부문 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1230930_2206.html"
            },
            {
                id: "SH_Y_C",
                name: "신한 이응패스 여민전 K-패스 체크카드",
                img: "../assets/images/card/sh_y_c.webp",
                benefits: ["대중교통 10% 할인", "간편결제·배달앱.편의점,커피전문점,올리브영,병원,.약국,OTT2%할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 5천원"] }
                ],
                url: "https://www.shinhancard.com/pconts/html/card/apply/check/1235507_2206.html"
            },
            {
                id: "NH_C",
                name: "농협 K-패스카드 체크",
                img: "../assets/images/card/nh_c.webp",
                benefits: ["대중교통 10% 캐시백", "이동통신요금 5% 캐시백", "커피전문점·편의점 5% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 1만 1천원"] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010470"
            },
            {
                id: "NH_G_C",
                name: "농협 K-패스카드(경기패스) 체크",
                img: "../assets/images/card/nh_g_c.webp",
                benefits: ["대중교통 10% 캐시백", "이동통신요금 5% 캐시백", "커피전문점·편의점 5% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 1만 1천원"] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010529"
            },
            {
                id: "NH_GN_C",
                name: "농협 K-패스카드(경남패스) 체크",
                img: "../assets/images/card/nh_gn_c.webp",
                benefits: ["대중교통 10% 캐시백", "이동통신요금 5% 캐시백", "커피전문점·편의점 5% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "80만원 이상"] },
                    { type: "한도", detail: ["최대 1만 1천원"] }
                ],
                url: "https://card.nonghyup.com/index_cardProd.html?SERVICE_ID=IPCC2021R&NAVIGATE_TYPE=1&cd_wrs_sqno=90010533"
            },
            {
                id: "BN",
                name: "농협 부산 동백전 체크 카드",
                img: "../assets/images/card/bn.webp",
                benefits: ["전통시장 2% 할인", "전통시장 외 0.2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "40만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://card.nonghyup.com/content/html/busan_chk_card.html"
            },
            {
                id: "NH_Y_C",
                name: "농협 이응패스-여민전 체크",
                img: "../assets/images/card/nh_y_c.webp",
                benefits: ["기본적립 : 0.2% / 0.3% / 0.4%", "추가적립 : 하나로마트/농협몰, GS25, CU, 올리브영, CGV, 스타벅스, 파리바게뜨, 면세점 0.3%", "국제공항 라운지 무료이용"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "50만원 이상", "100만원 이상"] },
                    { type: "한도", detail: ["한도없음(기본적립 0.3~0.4%)", "국제공항 라운지(연 1회)"] }
                ],
                url: "https://card.nonghyup.com/content/html/location_card.html?loc=sejongk"
            },
            {
                id: "KB_C",
                name: "KB국민 K-패스 체크 카드",
                img: "../assets/images/card/kb_c.webp",
                benefits: ["대중교통 10% 적립", "생활서비스 1% 적립", "KB Pay 이용 시 생활서비스 1% 추가적립"],
                conditions: [
                	{ type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 1만점"] }
                ],
                url: "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?mainCC=a&cooperationcode=09322"
            },
            {
                id: "KB_G_C",
                name: "KB국민 K-패스(경기패스) 체크 카드",
                img: "../assets/images/card/kb_g_c.jpg",
                benefits: ["대중교통 10% 적립", "생활서비스 1% 적립", "KB Pay 이용 시 생활서비스 1% 추가적립"],
                conditions: [
                	{ type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 1만점"] }
                ],
                url: "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?mainCC=a&cooperationcode=09347"
            },
            {
                id: "HN_C",
                name: "K-패스 하나 체크카드",
                img: "../assets/images/card/hana_c2.webp",
                benefits: ["대중교통 10% 캐시백", "다이소,올리브영 1% 캐시백", "스타벅스,커피빈 1% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 2만 1천원"] }
                ],
                url: "https://www.hanacard.co.kr/OPI41000000D.web?_frame=no&CD_PD_SEQ=17033",
                m_url: "https://m.hanacard.co.kr/MKLANDINGWM.web?url=/MKCDCM1000M.web?CD_PD_SEQ=17034"
            },
            {
                id: "HN_Y_C",
                name: "이응패스 하나 여민전 체크카드",
                img: "../assets/images/card/hn_ymj_c.png",
                benefits: ["편의점, 베이커리, 커피 1만원 이상 사용 시 건당 5% 적립", "대중교통(버스,지하철) 월 사용금액 5만원 이상 시 5% 적립"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 5천 하나머니"] }
                ],
                url: "https://api.ktgoodpay.com/appWeb/landing/main/wallet?pubCompanyId=GV0000000008"
            },
            {
                id: "BH",
                name: "하나 부산 동백전 체크카드",
                img: "../assets/images/card/bh.webp",
                benefits: ["전통시장 최대 5천 하나머니 적립", "부산광역시 소재 가맹점 최대 5천 하나머니 적립"],
                conditions: [
                    { type: "실적", detail: ["25만원 이상"] },
                    { type: "한도", detail: ["최대 1만 하나머니"] }
                ],
                url: "https://smart.hanacard.co.kr/mobile_web/partner/dong100"
            },
            {
                id: "WR_C",
                name: "K-패스 우리카드 체크",
                img: "../assets/images/card/wr_c.png",
                benefits: ["대중교통 10% 할인", "커피/편의점 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://pc.wooricard.com/dcpc/yh1/crd/crd01/H1CRD101S02.do?cdPrdCd=102865",
                m_url: "https://m.wooricard.com/dcmw/yh1/crd/crd01/M1CRD101S02.do?recomNo=102865"
            },
            {
                id: "IM_C",
                name: "iM뱅크 K-패스 체크카드",
                img: "../assets/images/card/imcard_c.webp",
                benefits: ["대중교통 10% 할인", "생활업종(배달앱,이동통신,편의점 등) 2% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 4천원"] }
                ],
                url: "https://mbanking.dgb.co.kr/com_ebz_mbs_00001.act?svcId=fis_ebz_sbs_41010_pddtl%2526PD_CD=40100101701076000%2526PD_NM=iM"
            },
            {
                id: "IBK_C",
                name: "IBK기업은행 K-패스(체크)",
                img: "../assets/images/card/ibk_c.webp",
                benefits: ["대중교통(버스,지하철) 건당 100원", "커피/쇼핑 10%, 편의점 5% 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "50만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://cardapplication.ibk.co.kr/card/index.do?card_prdc_id=103109"
            },
            {
                id: "SS_C",
                name: "K-패스 삼성 체크 카드",
                img: "../assets/images/card/samsung_c.webp",
                benefits: ["대중교통 10% 캐시백", "이동통신 10% 캐시백", "편의점/커피전문점/제과 1천원 캐시백", "CGV 3천원 할인"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상"] },
                    { type: "한도", detail: ["연 최대 11만 4천원"] }
                ],
                url: "https://www.samsungcard.com/home/card/cardinfo/PGHPPCCCardCardinfoDetails001?code=ABP1800"
            },
            {
                id: "KBANK",
                name: "케이뱅크 ONE 체크카드",
                img: "../assets/images/card/kbank_c.webp",
                benefits: ["모두다 캐시백 : 온라인 1.2%, 오프라인 0.7% 캐시백", "여기서 더 캐시백 : 자주 쓰는 곳에서 7% 캐시백", "369 캐시백: 3번 결제할 때마다 1,000원 캐시백"],
                conditions: [
                    { type: "실적", detail: ["대중교통 5만원 이상", "전월 실적 30만원 이상"] },
                    { type: "한도", detail: ["대중교통 월 3천원", "월 최대 2만 5천원"] }
                ],
                url: "https://www.kbanknow.com/k/tdbb0xS",
                m_url: "https://m.kbanknow.com/k/Vs6Yl9x"
            },
            {
                id: "KO",
                name: "K-패스 프렌즈 체크카드",
                img: "../assets/images/card/kakaobankcard.webp",
                benefits: ["대중교통 4천원 캐시백", "평일 0.2% 캐시백", "주말 0.4% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상"] },
                    { type: "한도", detail: ["최대 2만 9천원"] }
                ],
                url: "https://www.kakaobank.com/products/k-pass"
            },
            {
                id: "BB",
                name: "부산 동백전 체크카드",
                img: "../assets/images/card/bb.webp",
                benefits: ["가맹점 결재 시 최대 7%", "동백플러스 가맹점 QR 결제 시 최대 20%"],
                conditions: [
                    { type: "한도", detail: ["기본 캐시백 한도 30만원"] }
                ],
                url: "https://m.busanbank.co.kr/ib20/mnu/MWPMEM5100MEM20?IS_SCHEME=Y"
            },
            {
                id: "SY",
                name: "신협 K-패스 하이브리드 체크카드",
                img: "../assets/images/card/sy_c.webp",
                benefits: ["대중교통 10% 할인", "편의점/카페/쇼핑 1% 할인"],
                conditions: [
                    { type: "실적", detail: ["대중교통 30만원 이상 / 60만원 이상", "편의점/카페/쇼핑 30만원 이상"] },
                    { type: "한도", detail: ["최대 1만 8천원", "최대 2만 1천원"] }
                ],
                url: "https://m.cu.co.kr/mbranch/prd/PRD020103U/04"
            },
            {
                id: "SM",
                name: "새마을 금고 K-패스 카드",
                img: "../assets/images/card/sm_c.webp",
                benefits: ["대중교통 20% 할인", "연계교통(택시/주유 등)·생활혜택(통신/커피/다이소 등) 10% 할인"],
                conditions: [
                    { type: "실적", detail: ["20만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 2만원"] }
                ],
                url: "https://mbank.kfcc.co.kr/CARD/06/PMWCARD060201?PRDT_CD=104566&PRDT_NM=K-%ED%8C%A8%EC%8A%A4"
            },
            {
                id: "KN",
                name: "경남은행 K-패스 체크카드",
                img: "../assets/images/card/kn_l_c.webp",
                benefits: ["대중교통 15% 할인", "친환경 공유 모빌리티 5% 할인", "커피전문점/편의점/병원/약국 업종 10% 할인", "어학시험 2천원 캐시백"],
                conditions: [
                    { type: "실적", detail: ["30만원 이상", "60만원 이상"] },
                    { type: "한도", detail: ["최대 1만원"] }
                ],
                url: "https://m.knbank.co.kr/ib20/mnu/MOWCOM010000039?FNC_PRD_NO=0000211612"
            },
            {
                id: "JB",
                name: "전북은행 K-패스 체크카드",
                img: "../assets/images/card/jb_c.webp",
                benefits: ["대중교통 10% 캐시백", "이동통신/편의점/커피숍/온라인 쇼핑 1% 캐시백"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상"] },
                    { type: "한도", detail: ["최대 3천원", "최대 4천원"] }
                ],
                url: "https://m.jbbank.co.kr/s/Yn1xkK"
            },
            {
                id: "TB",
                name: "토스뱅크 체크카드(K-패스)",
                img: "../assets/images/card/toss_c.webp",
                benefits: ["오프라인 캐시백 월 최대 35,000원", "온라인 캐시백 월 최대 14,000원", "국내 결제금액의 0.3% 캐시백 또는 기부"],
                conditions: [
                    { type: "한도", detail: ["최대 3만 7천원",] }
                ],
                url: "https://tossbank.com/card/k-pass?referrer=k-pass_official-pc",
            	m_url: "https://toss.im/_m/bpCKTIAd"
            },
            {
                id: "JJ",
                name: "제주은행 K-패스 체크카드",
                img: "../assets/images/card/jj_c.webp",
                benefits: ["대중교통 10% 캐시백", "국내 가맹점 0.2%", "제주도 내 가맹점 0.5% 포인트 적립"],
                conditions: [
                	{ type: "실적", detail: ["20만원 이상"] },
                    { type: "한도", detail: ["최대 4천원 (대중교통 2천원, 포인트 적립 2천원)",] }
                ],
                url: "https://mob.jejubank.co.kr/mob/bridge.jsp?type=card&componentId=SD_PRO_01_05_010_01_M&loginYn=N&params=eyJwcmRDZCI6NDAwMjExMTIwMDgwLCJwcmRHcnBUeXBlIjoiMDIifQ%3D%3D"
            }
        ]
    },
    {
        type: "실물 · 선불",
        cards: [
            {
                id: "EB_REAL",
                name: "이즐 K-패스카드 (알뜰교통카드+, 더 경기패스, 광주G-패스)",
                img: "../assets/images/card/ezl2.webp",
                benefits: ["대중교통 10% 추가 적립: 전월 실적 기준의 혜택 제공 (※ 20만원 사용 시 대중교통 금액의 10% 추가 혜택(최대 2천원))", "이즐충전소 앱에서 카드 간편충전", "이즐포인트 적립(이즐워크(만보기), 출석체크, 룰렛 등)하여 교통비로 전환하여 사용가능"],
                conditions: [
                    { type: "실적", detail: ["20만원"] },
                    { type: "한도", detail: ["최대 2천원"] }
                ],
                url: "https://www.myezl.com/ezl/sub/kpass.do"
            },
            {
                id: "BE",
                name: "부산은행 K-패스 동백(선불형)",
                img: "../assets/images/card/be.webp",
                benefits: ["대중교통 10% 추가 적립: 전월 실적 기준의 혜택 제공 (※ 20만원 사용 시 대중교통 금액의 10% 추가 혜택(최대 2천원))", "모바일 충전서비스" , "이즐포인트 적립(이즐워크(만보기), 출석체크, 룰렛 등)하여 교통비로 전환하여 사용가능"],
                conditions: [
                    { type: "실적", detail: ["20만원"] },
                    { type: "한도", detail: ["최대 2천원"] }
                ],
                url: "https://m.busanbank.co.kr/ib20/mnu/MWPCRDL100CRD10?DBJ_APP=Y&IS_SCHEME=Y"
            },
            {
                id: "DG_REAL",
                name: "iM유페이 원패스",
                img: "../assets/images/card/onepass_real.webp",
                benefits: ["카드사 추가 마일리지 최대 7천원 적립", "매달 가장 빠르게 돌려받는 K-패스 적립금", "원패스 앱에서 카드 간편충전(모바일 충전 서비스)"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원 외 대중교통 결제 할인"] }
                ],
                url: "https://www.imupay.co.kr/personal/kPass"
            },
            {
                id: "TM",
                name: "티머니 K-패스 실물카드",
                img: "../assets/images/card/tmy_real.webp",
                benefits: ["대중교통 10% 추가 적립 전월 실적 없음 (당월 실적 기준 혜택 제공)", "대중교통 무료 보험(1년)", "계좌 환급 또는 T마일리지 환급 방식 선택 가능"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원"] }
                ],
                url: "https://pay.tmoney.co.kr/ncs/pct/tmnykpass/ReadKpassUtlzGd.dev"
            }
        ]
    },
    {
        type: "모바일 · 선불",
        cards: [
            {
                id: "EB",
                name: "이동의즐거움, 모바일이즐",
                img: "../assets/images/card/ezlphone.webp",
                benefits: ["대중교통 10% 추가 적립, 전월 실적 기준의 혜택 제공", "교통카드 간편 충전 서비스", "이즐워크(만보기) 기능으로 포인트 적립 가능(걸음 수 포인트 지급)"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원"] }
                ],
                url: "https://mob.cashbee.co.kr:60010/01/0/01/1/1/2/1/initalKpassInfoApp.do"
            },
            {
                id: "DG",
                name: "iM유페이 원패스",
                img: "../assets/images/card/onepass_phone.webp",
                benefits: ["카드사 추가 마일리지 최대 7천원 적립", "매달 가장 빠르게 돌려받는 K-패스 적립금", "원패스 앱에서 카드 간편충전(모바일 충전 서비스)"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원 외 대중교통 결제 할인"] }
                ],
                url: "https://play.google.com/store/apps/details?id=com.dgbupay.mobile"
            },
            {
                id: "EB_KAKAO",
                name: "카카오페이 K-패스",
                img: "../assets/images/card/kakao_phone.webp",
                benefits: ["대중교통 10% 추가 적립, 전월 실적 기준의 혜택 제공", "모바일 충전서비스(카카오페이머니)"],
                conditions: [
                    { type: "실적", detail: ["10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원 외 대중교통 결제 할인"] }
                ],
                url: "kakaotalk://kakaopay/payweb?url=https%3A%2F%2Ffest.kakao.com%2Fkayo%3Ft_src%3Daffiliate%26t_ch%3Dbanner%26t_obj%3Dmarketing"
            },
            {
                id: "NV",
                name: "네이버페이 모바일교통카드",
                img: "../assets/images/card/npaycard.webp",
                benefits: ["신규 등록 시 3천원(최초 1회)", "추가 적립금 최대 8천원"],
                conditions: [],
                url: "https://campaign2.naver.com/npay/transitcard/kpass/"
            },
            {
                id: "KR",
                name: "코레일 레일플러스",
                img: "../assets/images/card/krcard.webp",
                benefits: ["전월 대중교통 사용금액에 따라 최대 7천원 추가 환급", "KTX 마일리지 1% 추가 적립", "KTX 마일리지 → 모바일 레일플러스 충전금으로 전환 가능"],
                conditions: [
                    { type: "실적", detail: ["5만원 미만 ~ 30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원"] }
                ] ,
                url: "https://railplus.korail.com/com/mic/set/hps/hce/hpskpassIntroduce.do"
            },
            {
                id: "TM",
                name: "모바일티머니 K-패스",
                img: "../assets/images/card/tmoneycard.png",
                benefits: ["아이폰/안드로이드폰 이용자 모두 사용 가능", "대중교통 10% 추가 적립", "당월 실적 기준 혜택 제공(전월 실적 조건 없음)"],
                conditions: [
                    { type: "실적", detail: ["(당월 실적 기반)", "10만원 이상", "20만원 이상", "30만원 이상"] },
                    { type: "한도", detail: ["최대 7천원"] }
                ] ,
                url: " http://bit.ly/4o4raEQ"
            }
        ]
    },
]