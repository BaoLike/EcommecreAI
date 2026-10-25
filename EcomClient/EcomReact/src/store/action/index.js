import { useDispatch } from "react-redux";
import api from "../../api/api";
import { fetchLocationsAddress, clearAddresses } from "../reducers/LocationReducer";

export const fetchProducts = (queryString) => async (dispatch) => {
    try{
        dispatch({type: "IS_FETCHING"})
        const {data} = await api.get(`/public/products?${queryString}`)
        console.log("DATA FROM BACKEND:", data);
        dispatch({
            type: "FETCH_PRODUCTS",
            payload: data.content,
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage
        })
        dispatch({type: "IS_SUCCESS"})
    }catch(error){
        console.log(error);
        dispatch({
            type:"IS_ERROR",
            payload: error?.response?.data?.message || 'Không tải được danh sách sản phẩm',
        })
    }
}

export const fetchCategories = (queryString) => async (dispatch) => {
    try{
        dispatch({type: "CATEGORY_LOADER"})
        const {data} = await api.get(`/public/categories`)
        dispatch({
            type: "FETCH_CATEGORIES",
            payload: data.content, 
            pageNumber: data.pageNumber,
            pageSize: data.pageSize,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            lastPage: data.lastPage
        })
        dispatch({type: "CATEGORY_SUCCESS"})
    }catch(error){
        console.log(error);
        dispatch({
            type:"IS_ERROR",
            payload: error?.response?.data?.message || 'Không tải được danh mục sản phẩm',
        })
    }
}

export const addToCart = (data, quantity=1, toast) => async (dispatch, getState) => {
    const {products} = getState().products;
    const getProduct = products.find((item) => item.productId === data.productId);
    const listCartItem = localStorage.getItem('cartItemList') ? JSON.parse(localStorage.getItem('cartItemList')) : [];
    if(listCartItem.some((product) => product.productId === getProduct.productId)){
        toast.error('Sản phẩm này đã có trong giỏ hàng')
        return;
    }
    const isQuantityExist = getProduct.quantity >= quantity;
    if(isQuantityExist){
        try{
            toast.success(`Đã thêm ${data?.productName} vào giỏ hàng`);
            const productToAdd = { ...getProduct, quantity };
            const updatedCart = [...listCartItem, productToAdd];
            localStorage.setItem('cartItemList', JSON.stringify(updatedCart));
            dispatch({type: 'ADD_CART', payload: updatedCart});
            const reponse = await api.post(`/cart/products/${data.productId}/quantity/${quantity}`);
        }catch(e){
            toast.error("Không thể thêm sản phẩm vào giỏ hàng");
        }
        
        
    }
    else{
        toast.error("Sản phẩm đã hết hàng")
    }
};

export const increaseCartQuantity = (data, toast, currentQuantity, setCurrentQuantity) => async (dispatch, getState) => {
    const {products} = getState().products;
    console.log('products', products)
    const getProduct = products.find((item) => item.productId === data.productId);
    const listCartItem = JSON.parse(localStorage.getItem('cartItemList'));
    const isQuantityExist = getProduct.quantity >= currentQuantity + 1;

    if(isQuantityExist){
        const newQuantiy = currentQuantity + 1;
        setCurrentQuantity(newQuantiy);
        listCartItem.map((product) => {
            if(getProduct.productId === product.productId){
                product.quantity = newQuantiy;
            }
        });
        localStorage.setItem('cartItemList', JSON.stringify(listCartItem));
        const response = await api.post(`/card/products/${getProduct.productId}/quantity/add`);
    }
    else{
        toast.error("Đã đạt số lượng tối đa")
    }
}

export const descreaseCartQuantity = async (productId) =>{
    const response = await api.post(`/card/products/${productId}/quantity/delete`)
}

export const authenticateSignInUser = (sendData, toast, reset, navigate, setLoader) => async (dispatch) =>{
    try {
        setLoader(true);
        const {data} = await api.post("/auth/signin", sendData)
        dispatch({type: "LOGIN_USER", payload: data});
        localStorage.setItem("auth", JSON.stringify(data));
        await fetchCart();
        await dispatch(fetchLocationsAddress());
        reset()
        toast.success("Đăng nhập thành công");
        navigate("/")
    } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || "Lỗi máy chủ, vui lòng thử lại")
    } finally {
        setLoader(false)
    }
}

export const registerNewUser = (sendData, toast, reset, navigate, setLoader) => async (dispatch) =>{
    try {
        setLoader(true);
        const { username, email, password } = sendData;
        const {data} = await api.post("/auth/signup", { username, email, password })
        reset()
        toast.success(data?.message || "Đăng ký thành công");
        navigate("/login")
    } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || "Lỗi máy chủ, vui lòng thử lại")
    } finally {
        setLoader(false)
    }
}

export const fetchCart = async () => {
    try{
        console.log('fetch cart success');
        const response = await api.get('/card/user');
        localStorage.setItem('cartId', response.data.cartId);
        localStorage.setItem('cartItemList', JSON.stringify(response.data.products))
        return await response.data;
    }catch(error){
        console.log(error);
    }
    
}

export const deleteProductFromCart = async (productId) => {
    const cartId = localStorage.getItem('cartId');
    try{
        const listCartItem = JSON.parse(localStorage.getItem('cartItemList'));
        const newListCartItem = listCartItem.filter(product => product.productId !== productId);
        localStorage.setItem('cartItemList', JSON.stringify(newListCartItem));
        const response = await api.delete(`/carts/${cartId}/product/${productId}`);
    }catch(error){
        console.log("error from delete product", error)
    }
}

export const logoutUser = (navigate) => async (dispatch) => {
    try {
        await api.post('/auth/signout');
    } catch (error) {
        console.error('Server sign-out failed:', error);
    }
    dispatch({type: "LOG_OUT"})
    localStorage.clear()
    dispatch(clearAddresses());
    navigate("/login")
};
