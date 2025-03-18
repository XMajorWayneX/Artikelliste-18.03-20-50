import React, { useState, useEffect } from 'react';
import ItemSearch from './components/ItemSearch';
import ItemManagement from './components/ItemManagement';
import RegionManagement from './components/RegionManagement';
import LandingPage from './components/LandingPage';
import ManualEntries from './components/ManualEntries';
import { db, itemsCollection, regionsCollection, addDoc, setDoc, doc, deleteDoc, onSnapshot, collection, auth, onAuthStateChanged, signOut } from './firebase';
import { getDoc } from 'firebase/firestore';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [items, setItems] = useState([]);
  const [regions, setRegions] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [hasOverdueEntries, setHasOverdueEntries] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDocSnapshot = await getDoc(adminDocRef);

          if (adminDocSnapshot.exists() && adminDocSnapshot.data().isAdmin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }

          // Load favorites from localStorage
          const storedFavorites = localStorage.getItem(`favorites-${user.uid}`);
          if (storedFavorites) {
            try {
              setFavorites(JSON.parse(storedFavorites));
            } catch (error) {
              console.error("Error parsing stored favorites:", error);
              setFavorites({});
            }
          } else {
            setFavorites({});
          }

        } catch (error) {
          console.error("Error fetching admin status:", error);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
        setFavorites({}); // Clear favorites on sign out
      }
    });
    return () => unsubscribe();
  }, []);

  const checkOverdueEntries = (entries) => {
    const now = new Date();
    const hasOverdue = entries.some(entry => {
      if (entry.status === 'angebot erhalten' || !entry.abgabeBis) return false;
      const dueDate = new Date(entry.abgabeBis);
      return dueDate < now;
    });
    setHasOverdueEntries(hasOverdue);
  };

  useEffect(() => {
    let itemsUnsubscribe;
    let regionsUnsubscribe;
    let manualEntriesUnsubscribe;

    if (user && isAdmin) {
      itemsUnsubscribe = onSnapshot(itemsCollection, (snapshot) => {
        const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(itemsData); // Show all items directly
        setDbError(null);
      }, (error) => {
        console.error("Error fetching items:", error);
        setDbError("Fehler beim Laden der Artikel aus der Datenbank.");
      });

      regionsUnsubscribe = onSnapshot(regionsCollection, (snapshot) => {
        const regionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegions(regionsData);
        setDbError(null);
      }, (error) => {
        console.error("Error fetching regions:", error);
        setDbError("Fehler beim Laden der Gebiete aus der Datenbank.");
      });

      manualEntriesUnsubscribe = onSnapshot(collection(db, 'manualEntries'), (snapshot) => {
        const manualEntriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        checkOverdueEntries(manualEntriesData);
      });
    }

    return () => {
      if (itemsUnsubscribe) itemsUnsubscribe();
      if (regionsUnsubscribe) regionsUnsubscribe();
      if (manualEntriesUnsubscribe) manualEntriesUnsubscribe();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    // Save favorites to localStorage whenever it changes
    if (user) {
      localStorage.setItem(`favorites-${user.uid}`, JSON.stringify(favorites));
    }
  }, [favorites, user]);

  const handleAddItem = async (newItem) => {
    try {
      await addDoc(itemsCollection, { ...newItem, approved: true }); // Add directly to itemsCollection
      setDbError(null);
    } catch (error) {
      console.error("Error adding item", error);
      setDbError("Fehler beim Hinzufügen des Artikels zur Datenbank.");
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    try {
      const itemDocRef = doc(db, 'items', updatedItem.id); // Update in itemsCollection
      await setDoc(itemDocRef, updatedItem);
      setDbError(null);
    } catch (error) {
      console.error("Error updating item", error);
      setDbError("Fehler beim Aktualisieren des Artikels in der Datenbank.");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const itemDocRef = doc(db, 'items', itemId); // Delete from itemsCollection
      await deleteDoc(itemDocRef);
      setDbError(null);
    } catch (error) {
      console.error("Error deleting item", error);
      setDbError("Fehler beim Löschen des Artikels aus der Datenbank.");
    }
  };

  const handleAddRegion = async (newRegion) => {
    try {
      await addDoc(regionsCollection, newRegion); // Add region directly
      setDbError(null);
    } catch (error) {
      console.error("Error adding region", error);
      setDbError("Fehler beim Hinzufügen des Gebiets zur Datenbank.");
    }
  };

  const handleUpdateRegion = async (updatedRegion) => {
    try {
      const regionDocRef = doc(db, 'regions', updatedRegion.id);
      await setDoc(regionDocRef, updatedRegion);
      setDbError(null);
    } catch (error) {
      console.error("Error updating region", error);
      setDbError("Fehler beim Aktualisieren des Gebiets in der Datenbank.");
    }
  };

  const handleDeleteRegion = async (regionId) => {
    try {
      const regionDocRef = doc(db, 'regions', regionId);
      await deleteDoc(regionDocRef);
      setDbError(null);
    } catch (error) {
      console.error("Error deleting region", error);
      setDbError("Fehler beim Löschen des Gebiets aus der Datenbank.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const toggleFavorite = (itemId, regionId) => {
    setFavorites(prevFavorites => {
      const regionFavorites = prevFavorites[regionId] || new Set();
      if (regionFavorites.has(itemId)) {
        regionFavorites.delete(itemId);
      } else {
        regionFavorites.add(itemId);
      }

      return {
        ...prevFavorites,
        [regionId]: new Set(regionFavorites),
      };
    });
  };

  const isFavorite = (itemId, regionId) => {
    return favorites[regionId]?.has(itemId) || false;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LandingPage onSignIn={() => {}} />;
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <h2>Zugriff verweigert.</h2>
        <button onClick={handleSignOut}>Abmelden</button>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="nav">
        <button onClick={() => setActiveTab('search')} className={activeTab === 'search' ? 'active' : ''}>Suchen</button>
        <button onClick={() => setActiveTab('manageItems')} className={activeTab === 'manageItems' ? 'active' : ''}>Artikel erstellen</button>
        <button onClick={() => setActiveTab('manageRegions')} className={activeTab === 'manageRegions' ? 'active' : ''}>Gebiete verwalten</button>
        <button onClick={() => setActiveTab('manualEntries')} className={activeTab === 'manualEntries' ? 'active' : ''}>
          Anfragen
          {hasOverdueEntries && <span className="overdue-indicator">!</span>}
        </button>
        <button onClick={handleSignOut}>Abmelden</button>
      </nav>

      {dbError && <div className="error-message">{dbError}</div>}

      {activeTab === 'search' && (
        <ItemSearch
          items={items}
          regions={regions}
          toggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          favorites={favorites} // Always pass favorites
          showFavoritesOnly={false} // Always pass showFavoritesOnly
        />
      )}
      {activeTab === 'manageItems' && (
        <ItemManagement
          items={items}
          regions={regions}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
      )}
      {activeTab === 'manageRegions' && (
        <RegionManagement
          regions={regions}
          onAddRegion={handleAddRegion}
          onUpdateRegion={handleUpdateRegion}
          onDeleteRegion={handleDeleteRegion}
          items={items}
          onUpdateItem={handleUpdateItem}
        />
      )}
      {activeTab === 'manualEntries' && (
        <ManualEntries />
      )}
    </div>
  );
}

export default App;
