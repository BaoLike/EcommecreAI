import { FaPhone } from "react-icons/fa";

const Contact = () =>{
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-cover bg-center"
            style={{backgroundImage: "url(``)"}}>
            <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg">
                <h1 className="text-4xl font-bold  text-center mb-6">Liên hệ</h1>
                <p className="text-gray-600 text-center mb-4">Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>

                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Họ và tên
                        </label>
                        <input type="text" required 
                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input type="email" required 
                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Nội dung
                        </label>
                        <textarea row="4" required 
                        className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>

                    <button className="w-full bg-blue-500 text-white  py-2  rounded-lg hover:bg-blue-600 transition duration-300">
                        Gửi tin nhắn
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <h2 className="text-lg font-semibold">Thông tin liên hệ</h2>
                    <div className="flex flex-col items-center space-y-2 mt-4">
                        <div className="flex items-center ">
                            <FaPhone className="text-blue-500 mr-2"/>
                            <span className="text-gray-600">+84 376194639</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default Contact;