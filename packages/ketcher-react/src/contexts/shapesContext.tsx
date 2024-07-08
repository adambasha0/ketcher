// contexts/ShapesContext.js
import { createContext, useState, useContext } from 'react';

const ShapesContext = createContext(null);

export const ShapesProvider = ({ children }) => {
  const [item, setItem] = useState();

  const updateItem = (item) => {
    setItem(item);
    console.log({ item }, 'action item name');
  };

  return (
    <ShapesContext.Provider value={{ item, updateItem }}>
      {children}
    </ShapesContext.Provider>
  );
};

export const useShapesContext = () => useContext(ShapesContext);

export default ShapesContext;
