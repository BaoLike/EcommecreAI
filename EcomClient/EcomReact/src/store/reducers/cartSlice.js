import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cart: JSON.parse(localStorage.getItem("cartItemList")) || [],
  totalPrice: 0,
};

const calculateTotalPrice = (cart) =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addCart: (state, action) => {
      const productToAdd = action.payload;
      const existingProduct = state.cart.find(
        (item) => item.productId === productToAdd.productId
      );

      if (existingProduct) {
        // Cập nhật quantity nếu cần
        state.cart = state.cart.map((item) =>
          item.productId === productToAdd.productId ? productToAdd : item
        );
      } else {
        state.cart.push(productToAdd);
      }

      state.totalPrice = calculateTotalPrice(state.cart);
      localStorage.setItem("cartItemList", JSON.stringify(state.cart));
    },

    removeCart: (state, action) => {
      state.cart = state.cart.filter(
        (item) => item.productId !== action.payload
      );
      state.totalPrice = calculateTotalPrice(state.cart);
      localStorage.setItem("cartItemList", JSON.stringify(state.cart));
    },

    clearCart: (state) => {
      state.cart = [];
      state.totalPrice = 0;
      localStorage.removeItem("cartItemList");
    },
  },
});

export const { addCart, removeCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
