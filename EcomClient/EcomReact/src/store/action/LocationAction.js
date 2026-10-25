// locationActions.js
import { setAddresses, setLoading, setError } from './LocationReducer';
import api from '../../api/api';

// Fetch addresses from server
export const fetchAddresses = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const { data } = await api.get('/users/addresses');
    dispatch(setAddresses(data));
    
  } catch (error) {
    dispatch(setError(error?.message || 'Không tải được danh sách địa chỉ'));
    console.error('Error fetching addresses:', error);
  }
};

// Add new address to server
export const createAddress = (addressData) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    await api.post('/addresses', addressData);
    
    // Refresh addresses list
    dispatch(fetchAddresses());
    
  } catch (error) {
    dispatch(setError(error?.message || 'Không thể thêm địa chỉ'));
    console.error('Error creating address:', error);
  }
};

// Update address on server
export const updateAddressOnServer = (addressId, addressData) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    await api.put(`/addresses/${addressId}`, addressData);
    
    // Refresh addresses list
    dispatch(fetchAddresses());
    
  } catch (error) {
    dispatch(setError(error?.message || 'Không thể cập nhật địa chỉ'));
    console.error('Error updating address:', error);
  }
};

// Delete address from server
export const deleteAddressFromServer = (addressId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    await api.delete(`/addresses/${addressId}`);
    
    // Refresh addresses list
    dispatch(fetchAddresses());
    
  } catch (error) {
    dispatch(setError(error?.message || 'Không thể xóa địa chỉ'));
    console.error('Error deleting address:', error);
  }
};
