import { createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

const LocationSlice = createSlice({
  name: "location",
  initialState: {
    list: [],
    selectedAddressId: 0
  },
  reducers: {
    addLocation: (state, action) => {
      state.list.push(action.payload);
    },
    setLocations: (state, action) => {
      state.list = action.payload;
    },
    setSelectedAddressIdStore: (state, action) => {
      state.selectedAddressId = action.payload;
    },
    clearAddresses: (state) => {
      state.list = [];
      state.selectedAddressId = 0;
    },
  },
});

export const { setLocations, clearAddresses, setSelectedAddressIdStore } = LocationSlice.actions;
export const LocationReducer = LocationSlice.reducer;

export const fetchLocationsAddress = () => {
  return async (dispatch) => {
    try {
      const { data } = await api.get('/users/addresses');
      dispatch(setLocations(data));
      return data;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  };
};
