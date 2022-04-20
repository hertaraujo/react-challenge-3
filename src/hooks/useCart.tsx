import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) return JSON.parse(storagedCart);

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const res = await api.get(`stock/${productId}`);

      const stock = res.data as Stock;

      const newCart = [...cart];
      const productIndex = cart.findIndex(p => p.id === productId);
      const product = newCart[productIndex];

      if (productIndex !== -1) {
        if (product.amount + 1 > stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        newCart[productIndex] = {
          ...product,
          amount: product.amount + 1,
        };

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        return;
      }

      if (stock.amount === 0) {
        toast.error("Produto sem estoque");
        return;
      }

      const { data: newProduct } = await api.get(`products/${productId}`);

      setCart(cart => {
        const newCart = [...cart, { ...newProduct, amount: 1 } as Product];
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        return newCart;
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(p => p.id === productId);
      if (productIndex === -1) throw new Error();

      setCart(cart => {
        const newCart = cart.filter(p => p.id !== productId);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        return newCart;
      });
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get(`stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart(cart => {
        const newCart = cart.map(p => {
          if (p.id !== productId) return p;

          return p.amount > amount
            ? { ...p, amount: p.amount - 1 }
            : { ...p, amount: p.amount + 1 };
        });

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        return newCart;
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
