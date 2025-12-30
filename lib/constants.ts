export const APP_CONFIG = {
  // Cấu hình hiển thị Web
  app: {
    title: "SheetApp | Làm App thật dễ dàng",
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
    bank_id: "970418", // Mã Vietcombank
    bank_name: "BIDV",
    account_no: "31810000034086",
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