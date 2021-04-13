import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const CART_KEY = '@RocketShoes:cart';
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if(product) {
        return updateProductAmount({ 
          productId: product.id, 
          amount: product.amount + 1
        });
      }
      const response = await api.get(`/products/${productId}`);
      const newProduct: Product = response.data;
      if(!newProduct) {
        throw new Error('Erro na adição do produto');
      }
      const productAdded = {
        ...newProduct,
        amount: 1
      }
      const cartWithNewProduct = [...cart, productAdded];
      setCart(cartWithNewProduct);
      localStorage.setItem(CART_KEY, JSON.stringify(cartWithNewProduct));
    } catch ({ message = 'Erro na adição do produto'}){
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);
      if(productIndex === -1) {
        throw new Error('Erro na remoção do produto');
      }
      const cartRemove = cart.filter(product => product.id !== productId);
      setCart(cartRemove);
      localStorage.setItem(CART_KEY, JSON.stringify(cartRemove));
    } catch ({ message }){
      toast.error(message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        throw new Error('Erro na alteração de quantidade do produto');
      }
      const productIndex = cart.findIndex(product => product.id === productId);
      if(productIndex === -1) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const response = await api.get(`/stock/${productId}`);
      const productStock: Stock = response.data;
      if(productStock && productStock.amount < amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const updatedProduct = {
        ...cart[productIndex],
        amount
      };
      const cartUpdate = cart.map((cartProduct, index) => {
        if(index === productIndex) {
          return updatedProduct;
        }
        return cartProduct;
      });
      cartUpdate[productIndex] = updatedProduct;
      setCart(cartUpdate);
      localStorage.setItem(CART_KEY, JSON.stringify(cartUpdate));

    } catch( { message = 'Erro na alteração de quantidade do produto' }) {
      toast.error(message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
