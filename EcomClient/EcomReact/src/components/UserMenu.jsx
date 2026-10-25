import React from "react";
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Avatar } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { BiUser } from "react-icons/bi";
import { FaShoppingCart } from "react-icons/fa";
import { IoExitOutline } from "react-icons/io5";
import BackDrop from "./BackDrop";
import { useDispatch } from "react-redux";
import { logoutUser } from "../store/action";

const UserMenu = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const user = JSON.parse(localStorage.getItem("auth"))
  console.log("user information", user)
  const handleClose = () => {
    setAnchorEl(null);
  };

  const logoutHandle = () => {
    dispatch(logoutUser(navigate));
  }

  return (
    <div>
      <div
        className="sm:border-[1px] sm:border-slate-400 flex flex-row items-center gap-1 rounded-full cursor-pointer hover:shadow-md transition text-slate-700"
        onClick={handleClick}
      >
        <Avatar/>
      </div>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': 'basic-button',
            sx: {width: 160},
          },
        }}
      >
        <Link to="/profile">
            <MenuItem onClick={handleClose} className="flex gap-2"
                    >
                        <BiUser className="text-xl"/>
                        <span className="font-bold text-[16px] mt-1 ">
                            {user.username}
                        </span>
            </MenuItem>
        </Link>

        <Link to="/profile/order">
            <MenuItem onClick={handleClose} className="flex gap-2">
                <FaShoppingCart className="text-xl"/>
                <span className="font-semibold">Order</span>
            </MenuItem>
        </Link>

        <MenuItem onClick={logoutHandle} className="flex gap-2">
            <div className="font-semibold w-full flex gap-2 items-center bg-button-gradient  px-4 py-1  text-white rounded-sm">
                <IoExitOutline className="text-xl"/>
                <span className="font-bold text-[16px] mt-1 ">
                    Logout
                </span>
            </div>
        </MenuItem>
      </Menu>

      {open && <BackDrop />}
    </div>
  );
};

export default UserMenu;