import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { AiOutlineLogin } from 'react-icons/ai';
import InputField from '../shared/InputField';
import { useDispatch, useSelector } from 'react-redux';
import { FaAddressCard } from 'react-icons/fa';
import { MenuItem, Select, InputLabel } from '@mui/material';
import api from '../../api/api';
import toast from 'react-hot-toast';
import Spinner from "../shared/Spinner";
import { fetchLocationsAddress } from '../../store/reducers/LocationReducer';

export const AddAddressForm = () => {

    const {btnLoader} = useSelector((state) => state.errors)
    const dispatch = useDispatch();
    const listLocation = useSelector((state) => state.listLocate.locations);
    const [selectedProvinces, setSelectedProvinces] = useState(0);
    const [selectedWard, setSelectedWard] = useState('');
    const [loaderSubmit, setLoaderSubmit] =useState(false);

    const {
            register,
            handleSubmit,
            reset,
            formState: {errors}
        } = useForm({
            mode: "onTouched",
        });
        
    const handleChangeProvinces = (event) => {
      setSelectedProvinces(event.target.value);
      console.log("User selected provinces:", event.target.value);
    };

    const handleChangeWard = (event) => {
      setSelectedWard(event.target.value);
      console.log("User selected ward:", event.target.value);
    }


    const onSaveAddAddressHandle = async (data) => {
        const dataAddressInforToSend = {
          street: data.street,
          buildingName: data.buildingName,
          city: listLocation.find((province) => Number(province.id) === Number(selectedProvinces))?.full_name,
          ward: selectedWard,
          receiverName: data.receiverName,
          phoneNumberReceiver: data.phoneNumberReceiver
        }
        if (!dataAddressInforToSend.city || !selectedWard) {
          toast.error('Vui lòng chọn tỉnh/thành và phường/xã.');
          return;
        }
        setLoaderSubmit(true);
        try{
          const response = await api.post("/addresses", dataAddressInforToSend);
          if(response.status === 201){
            await dispatch(fetchLocationsAddress());
            reset();
            toast.success("Thêm địa chỉ nhận nhận hàng thành công")
          }
          else{
            toast.error("Đã có lỗi xảy ra vui lòng thử lại sau");
          }
          
        }catch{
            toast.error("Đã có lỗi xảy ra vui lòng thử lại sau");
        } finally {
          setLoaderSubmit(false);
        }
        
      }


    return (
    <div className="max-w-4xl mx-auto px-6">
        <form onSubmit={handleSubmit(onSaveAddAddressHandle)} className="">
          <div className="flex justify-center items-center mb-4 font-semibold text-2xl text-slate-800 py-2 px-4">
            <FaAddressCard className="mr-2 text-2xl"/>
            Thêm thông tin nhận hàng
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 gap-y-7">
            <div className="flex flex-col gap-6 mb-4">
              <InputField
                
                label="Tên người nhận"
                required
                id="receiverName"
                type="text"
                message="*Tên người nhận là bắt buộc"
                placeHolder="Nhập tên người nhận"
                register={register}
                errors={errors}
              />

              <InputField
                label="Số điện thoại"
                required
                id="phoneNumberReceiver"
                type="text"
                message="*Số điện thoại là bắt buộc"
                placeHolder="Nhập số điện thoại"
                register={register}
                errors={errors}
              />

              <div>
                <InputLabel id="city-select-label">Tỉnh/Thành</InputLabel>
                <Select 
                  labelId="city-select-label"
                  label="provinces"
                  value={selectedProvinces}
                  onChange={handleChangeProvinces}
                  className="min-w-full text-slate-800 border-slate-700"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 'auto',
                      },
                    },
                  }}
                >
                  {listLocation.map((item) => (
                    <MenuItem value={item.id} key={item.id}>
                      {item.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            </div>
              
            <div className="flex flex-col gap-6">
              <InputField
                label="Tên tòa nhà/Số nhà"
                required
                id="buildingName"
                type="text"
                message="*Tên tòa nhà là bắt buộc"
                placeHolder="Nhập tên tòa nhà/số nhà"
                register={register}
                errors={errors}
              />

              <InputField
                label="Tên đường"
                required
                id="street"
                type="text"
                message="*Tên đường là bắt buộc"
                placeHolder="Nhập tên đường"
                register={register}
                errors={errors}
              />

              <div>
                <InputLabel id="ward-select-label">Phường/Xã</InputLabel>
                <Select 
                  onChange={handleChangeWard}
                  labelId="ward-select-label"
                  label="ward"
                  className="min-w-full text-slate-800 border-slate-700"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 'auto',
                      },
                    },
                  }}
                >
                  {selectedProvinces !== 0 && listLocation[selectedProvinces-11].wards.map((item) => (
                    <MenuItem value={item.name} key={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
              
          <button 
            disabled={btnLoader}
            type="submit"
            className="bg-button-gradient flex gap-2 items-center justify-center font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100 rounded-sm mt-6"
          >
            {loaderSubmit ? (
              <>
                <Spinner/>
                Đang lưu...
              </>
            ) : (
              <>Lưu địa chỉ</>
            )}
          </button>
        </form>
  </div>
  )
}
