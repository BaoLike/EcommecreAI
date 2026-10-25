// LocationReducer.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  addresses: [],
  selectedAddressId: null,
  loading: false,
  error: null
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    // Set all addresses from server
    setAddresses: (state, action) => {
      state.addresses = action.payload;
      state.loading = false;
      state.error = null;
    },
    
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    // Set error
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Select an address
    selectAddress: (state, action) => {
      state.selectedAddressId = action.payload;
    },
    
    // Add a new address
    addAddress: (state, action) => {
      state.addresses.push(action.payload);
    },
    
    // Update an address
    updateAddress: (state, action) => {
      const index = state.addresses.findIndex(
        addr => addr.addressId === action.payload.addressId
      );
      if (index !== -1) {
        state.addresses[index] = action.payload;
      }
    },
    
    // Delete an address
    deleteAddress: (state, action) => {
      state.addresses = state.addresses.filter(
        addr => addr.addressId !== action.payload
      );
      // If deleted address was selected, clear selection
      if (state.selectedAddressId === action.payload) {
        state.selectedAddressId = null;
      }
    },
    
    // Clear all addresses
    clearAddresses: (state) => {
      state.addresses = [];
      state.selectedAddressId = null;
    }
  }
});

export const {
  setAddresses,
  setLoading,
  setError,
  selectAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  clearAddresses
} = locationSlice.actions;

export default locationSlice.reducer;