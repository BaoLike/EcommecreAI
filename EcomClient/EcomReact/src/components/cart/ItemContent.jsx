import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import SetQuantity from "./SetQuantity";
import { useDispatch } from "react-redux";
import { descreaseCartQuantity, fetchProducts, increaseCartQuantity, deleteProductFromCart } from "../../store/action";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

const ConfirmRemoveDialog = ({ open, onClose, onConfirm, productName }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Removal</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove <strong>{productName}</strong> from your cart? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ItemContent = ({
  productId,
  productName,
  image,
  description,
  quantity,
  price,
  discount,
  specialPrice,
  cartId,
  handleUpdateCartItem,
}) => {
  const [currentQuantity, setCurrentQuantity] = useState(quantity);
  const [dialogOpen, setDialogOpen] = useState(false);  // <-- THÊM: State mở/đóng dialog
  const [selectedProductId, setSelectedProductId] = useState(null);  // <-- THÊM: Lưu ID product khi confirm
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);  

  const handleRemoveClick = () => {
    setSelectedProductId(productId);
    setDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (selectedProductId) {
      try {
        deleteProductFromCart(productId); 
        toast.success(`${productName} removed from cart!`); 
        const listCartItems = handleUpdateCartItem()
        dispatch({type: 'DELETE_CART', payload: listCartItems})
      } catch (error) {
        toast.error("Failed to remove item from cart");
        console.error("Delete error:", error);
      }
      setDialogOpen(false);
      setSelectedProductId(null);
    }
  };

  // Xử lý close dialog (không xóa)
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProductId(null);
  };

  const handleQuantityIncrease = (cartItems) => {
    dispatch(
      increaseCartQuantity(cartItems, toast, currentQuantity, setCurrentQuantity)
    );
    handleUpdateCartItem();
  };

  const handleQuantityDecrease = (cartItems) => {
    if (currentQuantity > 1) {
      const newQuantity = currentQuantity - 1;
      setCurrentQuantity(newQuantity);
      const listCartItem = JSON.parse(localStorage.getItem('cartItemList'));
      listCartItem.map((product) => {
            if(productId === product.productId){
                product.quantity--;
            }
      });
      localStorage.setItem('cartItemList', JSON.stringify(listCartItem));
      handleUpdateCartItem();
      dispatch(descreaseCartQuantity(productId));
    }
  };

  return (
    <div className="grid md:grid-cols-5 grid-cols-4 md:text-md text-sm gap-4 items-center border-[1px] border-slate-200">
      <div className="md:col-span-2 justify-self-start flex flex-col gap-2">
        <div className="flex md:flex-row flex-col lg:gap-4 sm:gap-3 gap-0 items-start">
          <div className="md:w-36 sm:w-24 w-12">
            <img
              src={image}
              alt={productName}
              className="md:h-36 sm:h-24 h-12 w-full object-cover rounded-md"
            />
          </div>
          <h3 className="lg:text-[17px] text-sm font-semibold text-slate-600 flex-1">
            {productName}
          </h3>
        </div>

        {/* Nút Remove - gắn handleRemoveClick */}
        <div className="flex items-start gap-5 mt-3">
          <button
            onClick={handleRemoveClick}  // <-- Fix: Mở dialog thay vì xóa trực tiếp
            className="flex items-center font-semibold space-x-2 px-4 py-1 text-xs border-rose-600 text-rose-600 rounded-md hover:bg-red-50 transition-colors duration-200"
          >
            <FaTrash size={20} className="text-rose-600" />
            Remove from cart
          </button>
        </div>
      </div>

      <div className="justify-self-center lg:text-[17px] text-sm text-slate-600 font-semibold">
        <SetQuantity
          quantity={currentQuantity}
          cartCounter={true}
          handleQuantityDecrease={() => {
            handleQuantityDecrease({
              image,
              productName,
              description,
              specialPrice,
              price,
              productId,
              quantity,
            });
          }}
          handleQuantityIncrease={() => {
            handleQuantityIncrease({
              image,
              productName,
              description,
              specialPrice,
              price,
              productId,
              quantity,
            });
          }}
        />
      </div>

      <div className="justify-self-center">{Number(specialPrice)}</div>

      <div className="justify-self-center lg:text-[17px] text-sm text-slate-600 font-semibold">
        {Number(currentQuantity) * Number(specialPrice)}
      </div>

      {/* Dialog - render ở cuối component */}
      <ConfirmRemoveDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmRemove}
        productName={productName}  // Truyền tên product động
      />
    </div>
  );
};

export default ItemContent;