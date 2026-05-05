import React from 'react';
import { Facebook, Twitter, Linkedin, Github, Mail, MapPin, Phone } from 'lucide-react';
const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Cột 1: Thông tin công ty */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <img className="w-10 h-10" src="https://i.postimg.cc/8CF77D7h/image_2025_12_29_113930961.png" alt="" />
                            <span>Deepcode</span>
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Tiên phong trong việc ứng dụng AI để phân tích, rà soát và tối ưu hóa mã nguồn. Giúp đội ngũ lập trình viên làm việc thông minh và hiệu quả hơn.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Github size={20} />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                <Twitter size={20} />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Linkedin size={20} />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                                <Facebook size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Cột 2: Sản phẩm & Dịch vụ */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Sản phẩm</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">AI Code Review</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Bảo mật mã nguồn</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Tích hợp CI/CD</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Bảng giá</a></li>
                        </ul>
                    </div>

                    {/* Cột 3: Tài nguyên */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Tài nguyên</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Tài liệu API (Docs)</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Blog công nghệ</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Cộng đồng Developers</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Trung tâm hỗ trợ</a></li>
                        </ul>
                    </div>

                    {/* Cột 4: Liên hệ */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Liên hệ</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>Tầng 3, số 208, Phố Vạn Phúc, Hà Đông, Hà Nội</span>
                            </li>
                            {/* <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <span>+84 35 2131 338</span>
              </li> */}
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="text-blue-500 shrink-0" />
                                <a href="mailto:contact@deepcode.vn" className="hover:text-blue-400 transition-colors">
                                    contact@deepcode.vn
                                </a>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Phần Bottom Footer */}
                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        &copy; {currentYear} Deepcode Technologies. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-sm text-gray-500">
                        <a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a>
                        <a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a>
                        <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;