import AdminLayout from "../admin/AdminLayout";
import UserProfile from "./userProfile";

const Profile = () => {
    const inforUser = JSON.parse(localStorage.getItem("auth") || "null");
    const roleUser = Array.isArray(inforUser?.roles) ? inforUser.roles : [];
    if(roleUser.includes("ROLE_ADMIN")){
        return <AdminLayout/>
    }
    else{
        return <UserProfile/>
    }
}
export default Profile
