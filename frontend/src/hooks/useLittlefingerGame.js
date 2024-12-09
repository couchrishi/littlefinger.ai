import { useEffect, useState } from "react";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import db from "../config/firebaseConfig";

export const useLittlefingerGame = (connectedAccount) => {
  const [globalContext, setGlobalContext] = useState([]);
  const [localHistory, setLocalHistory] = useState([]);

  // Fetch Global Context in Real-Time
  useEffect(() => {
    const q = query(collection(db, "global-context"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setGlobalContext(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Local Context for the User
  useEffect(() => {
    if (connectedAccount) {
      const fetchLocalHistory = async () => {
        const docRef = doc(db, "user-context", connectedAccount);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLocalHistory(docSnap.data().localHistory || []);
        }
      };
      fetchLocalHistory();
    }
  }, [connectedAccount]);

  // Add Query to Global and Local Contexts
  const addQuery = async (queryText, responseText) => {
    const timestamp = new Date().toISOString();
    const queryData = {
      query: queryText,
      response: responseText,
      player: connectedAccount,
      timestamp,
    };

    // Add to Global Context
    await addDoc(collection(db, "global-context"), queryData);

    // Add to Local Context
    const localDocRef = doc(db, "user-context", connectedAccount);
    const localHistoryUpdate = [...localHistory, queryData];
    await setDoc(localDocRef, { localHistory: localHistoryUpdate });

    setLocalHistory(localHistoryUpdate);
  };

  return { globalContext, localHistory, addQuery };
};
