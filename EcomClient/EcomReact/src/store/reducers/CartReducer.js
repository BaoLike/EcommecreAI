import { useSelector } from "react-redux";


const getCartFromStorage = () => {
  try {
    const cartData = localStorage.getItem('cartItemList');
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error parsing cart data:', error);
    return [];
  }
};

const initialState = {
    cart: getCartFromStorage(),
    totalPrice: 0, 
    cartId: 0,
    quantityCartItems: getCartFromStorage().length,
}

export const CartReducer = (state = initialState, action) => {
    const productToAdd = action.payload || [];
    if(action.type === "ADD_CART"){
        return {
            ...state,
            quantityCartItems: productToAdd.length,
        }
    }
    else if(action.type ==='DELETE_CART'){
        if(productToAdd.length === 0 ){
            return {
                ...state,
                quantityCartItems: 0,
            }
        }
        else{
            return{
                ...state,
                quantityCartItems: productToAdd.length,
            }
        }
    }
    else{
        return state;
    }
}