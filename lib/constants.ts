export const APP_CONFIG = {
  // Cấu hình hiển thị Web
  app: {
    title: "SheetApp | App thực chiến",
    favicon: "https://ui-avatars.com/api/?name=Sheet+App&background=10b981&color=fff&rounded=true&bold=true&size=128",
  },

  contact: {
    phone: "0987 726 236", // Dùng hiển thị
    hotline_clean: "0987726236", // Dùng cho link tel:
    email: "sheetappai@gmail.com",
    // Địa chỉ duy nhất
    address: "Chung cư Moscow Tower, P. Tân Thới Nhất, Q.12, TP.HCM",
    map_url: "https://maps.app.goo.gl/..."
  },

  social: {
    facebook: "https://facebook.com/sheetapp",
    zalo: "https://zalo.me/0987726236",
    zaloOA: "https://zalo.me/521492569667566752",
    youtube: "https://youtube.com/@sheetapp",
    messenger: "https://m.me/61585387094666"
  },

  payment: {
    bank_id: "970422", // Mã MBBank
    bank_name: "MBBank",
    account_no: "0987726236",
    account_name: "VO TAN NHUONG",
    branch_payment: "Chi nhánh Hóc Môn", // Chuyển Hóc Môn về đây
    // Link tạo QR tự động
    get qr_link() {
      return `https://img.vietqr.io/image/${this.bank_id}-${this.account_no}-compact2.jpg?amount=0&addInfo=Chuyen tien&accountName=${encodeURIComponent(this.account_name)}`;
    }
  },

  designer: {
    name: "CÔNG TY TNHH GIẢI PHÁP BIM VIỆT",
    url: "https://bimvietsolutions.com"
  }
};

// --- CẤU TRÚC DỮ LIỆU BỘ LỌC 2 CẤP ---
export const FILTER_TREE = {
  industry: [
    {
      group: "Xây dựng",
      tags: ["Nhà thầu", "Chủ đầu tư", "Tư vấn thiết kế", "Tư vấn giám sát"]
    },
    {
      group: "F&B",
      tags: ["Nhà hàng", "Khách sạn", "Khu du lịch", "Quán Cafe", "Bar/Pub"]
    },
    {
      group: "Giáo dục",
      tags: ["Trung tâm ngoại ngữ", "Dạy online", "Dạy offline", "Trường học"]
    },
    {
      group: "Y tế",
      tags: ["Nha khoa", "Phòng khám tư", "Nhà thuốc"]
    },
    {
      group: "Dịch vụ",
      tags: ["Trung tâm sát hạch lái xe", "Vận tải", "Logistics"]
    },
    {
      group: "Thời trang & Spa",
      tags: ["Cửa hàng thời trang", "Fitness & Gym", "Spa & Làm đẹp"]
    },
    {
      group: "Sản xuất",
      tags: ["Công ty bao bì", "Công ty Gỗ", "Công ty Dày Da", "Cơ khí"]
    }
  ],
  tech: [
    {
      group: "Nocode",
      tags: ["AppSheet", "NocodeBase", "Airtable"]
    },
    {
      group: "Web App",
      tags: ["Appscript", "Web giải pháp", "Next.js", "React"]
    },
    {
      group: "Zalo Mini App",
      tags: ["Zalo Mini App", "Zalo OA"]
    },
    {
      group: "Bảng tính",
      tags: ["Google Sheet", "File Excel", "VBA"]
    },
    {
      group: "Phần mềm máy tính",
      tags: ["Ứng dụng phần mềm", "Office Extension", "Tools PC"]
    },
    {
      group: "Automation",
      tags: ["n8n", "Make.com", "Chatbot AI"]
    }
  ]
};