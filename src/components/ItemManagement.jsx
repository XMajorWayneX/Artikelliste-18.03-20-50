import React, { useState, useRef, useEffect } from 'react';
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';

function ItemManagement({ items, regions, onAddItem, onUpdateItem, onDeleteItem }) {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [schutzart, setSchutzart] = useState('');
  const [bws, setBws] = useState('');
  const [typ, setTyp] = useState('');
  const [art, setArt] = useState('');
  const [serie, setSerie] = useState('');
  const [material, setMaterial] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [copyToRegion, setCopyToRegion] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const formRef = useRef(null);
  const [manualSortOrder, setManualSortOrder] = useState([]);
  const [sortedItems, setSortedItems] = useState([]);
  const [regionSelected, setRegionSelected] = useState(false);
  const [isSelectingItems, setIsSelectingItems] = useState(false);
  const [selectedItemsForPriceUpdate, setSelectedItemsForPriceUpdate] = useState([]);
  const [priceAdjustmentValue, setPriceAdjustmentValue] = useState('');
  const [copyToRegionForSelected, setCopyToRegionForSelected] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedRegionName, setSelectedRegionName] = useState('');

  useEffect(() => {
    if (selectedRegion) {
      const filtered = items.filter(item => item.regions && item.regions.includes(selectedRegion) && item.name.toLowerCase().includes(searchItem.toLowerCase()));

      // Wende die manuelle Sortierung an, falls vorhanden
      const sorted = manualSortOrder.length > 0
        ? manualSortOrder
          .map(id => filtered.find(item => item.id === id))
          .filter(item => item !== undefined) // Stelle sicher, dass keine ungültigen IDs vorhanden sind
        : [...filtered].sort((a, b) => {
          const aPrefix = a.name.substring(0, 3).toUpperCase();
          const bPrefix = b.name.substring(0, 3).toUpperCase();
          const prefixComparison = aPrefix.localeCompare(bPrefix);

          if (prefixComparison !== 0) {
            return prefixComparison;
          }

          const endingsOrder = ["0", "0-SV", "3", "3AC", "3BC"];
          const aEnding = endingsOrder.find(ending => a.name.endsWith(ending)) || "";
          const bEnding = endingsOrder.find(ending => b.name.endsWith(ending)) || "";

          const aIndex = endingsOrder.indexOf(aEnding);
          const bIndex = endingsOrder.indexOf(bEnding);

          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          } else if (aIndex !== -1) {
            return -1;
          } else if (bIndex !== -1) {
            return 1;
          } else {
            return a.name.localeCompare(b.name);
          }
        });

      setSortedItems(sorted);
    } else {
      setSortedItems([]);
    }
  }, [items, selectedRegion, searchItem, manualSortOrder]);

  useEffect(() => {
    if (selectedRegion) {
      const region = regions.find(r => r.id === selectedRegion);
      setSelectedRegionName(region ? region.name : '');
    } else {
      setSelectedRegionName('');
    }
  }, [selectedRegion, regions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedRegion) {
      alert('Bitte wähle zuerst ein Gebiet aus.');
      return;
    }
    const newItem = {
      name,
      price,
      regions: [selectedRegion],
      schutzart,
      bws,
      typ,
      art,
      serie,
      material,
      order: items.length + 1, // Set initial order
    };

    if (editingItemId) {
      onUpdateItem({ id: editingItemId, ...newItem });
    } else {
      onAddItem(newItem);
    }

    setName('');
    setPrice('');
    setSchutzart('');
    setBws('');
    setTyp('');
    setArt('');
    setSerie('');
    setMaterial('');
    setEditingItemId(null);
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setName(item.name);
    setPrice(item.price);
    setSchutzart(item.schutzart);
    setBws(item.bws);
    setTyp(item.typ);
    setArt(item.art);
    setSerie(item.serie);
    setMaterial(item.material);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyItem = () => {
    if (!editingItemId) {
      alert('Bitte wählen Sie zuerst einen Artikel zum Kopieren aus.');
      return;
    }

    const itemToCopy = items.find(item => item.id === editingItemId);

    if (!itemToCopy) {
      alert('Artikel zum Kopieren nicht gefunden.');
      return;
    }

    const newItem = {
      name: itemToCopy.name,
      price: itemToCopy.price,
      regions: [selectedRegion],
      schutzart: itemToCopy.schutzart,
      bws: itemToCopy.bws,
      typ: itemToCopy.typ,
      art: itemToCopy.art,
      serie: itemToCopy.serie,
      material: itemToCopy.material,
      order: items.length + 1, // Set initial order
    };

    onAddItem(newItem);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Möchten Sie diesen Artikel wirklich löschen?')) {
      onDeleteItem(itemId);
    }
  };

  const handleDeleteAllItems = () => {
    if (window.confirm(`Möchten Sie wirklich alle Artikel für das Gebiet ${regions.find(r => r.id === selectedRegion)?.name} löschen?`)) {
      const allItemsInSelectedRegion = items.filter(item => item.regions && item.regions.includes(selectedRegion));
      allItemsInSelectedRegion.forEach(item => onDeleteItem(item.id));
    }
  };

  const handleCopyToRegion = () => {
    if (!copyToRegion) {
      alert('Bitte wählen Sie ein Zielgebiet aus.');
      return;
    }

    if (window.confirm(`Möchten Sie wirklich alle Artikel von ${regions.find(r => r.id === selectedRegion)?.name} nach ${regions.find(r => r.id === copyToRegion)?.name} kopieren?`)) {
      const allItemsInSelectedRegion = items.filter(item => item.regions && item.regions.includes(selectedRegion));
      allItemsInSelectedRegion.forEach(item => {
        const newItem = {
          name: item.name,
          price: item.price,
          regions: [copyToRegion],
          schutzart: item.schutzart,
          bws: item.bws,
          typ: item.typ,
          art: item.art,
          serie: item.serie,
          material: item.material,
          order: items.length + 1, // Set initial order
        };
        onAddItem(newItem);
      });
      setCopyToRegion('');
    }
  };

  const moveItemUp = async (item) => {
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    if (currentIndex > 0) {
      const newSortOrder = [...sortedItems];
      const temp = newSortOrder[currentIndex];
      newSortOrder[currentIndex] = newSortOrder[currentIndex - 1];
      newSortOrder[currentIndex - 1] = temp;

      setSortedItems(newSortOrder);
      setManualSortOrder(newSortOrder.map(item => item.id));

      const otherItem = sortedItems[currentIndex - 1];
      await swapOrder(item, otherItem);
    }
  };

  const moveItemDown = async (item) => {
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    if (currentIndex < sortedItems.length - 1) {
      const newSortOrder = [...sortedItems];
      const temp = newSortOrder[currentIndex];
      newSortOrder[currentIndex] = newSortOrder[currentIndex + 1];
      newSortOrder[currentIndex + 1] = temp;

      setSortedItems(newSortOrder);
      setManualSortOrder(newSortOrder.map(item => item.id));

      const otherItem = sortedItems[currentIndex + 1];
      await swapOrder(item, otherItem);
    }
  };

  const swapOrder = async (item1, item2) => {
    const item1Ref = doc(db, 'items', item1.id);
    const item2Ref = doc(db, 'items', item2.id);

    // Optimistic update
    onUpdateItem({ ...item1, order: item2.order });
    onUpdateItem({ ...item2, order: item1.order });

    try {
      await updateDoc(item1Ref, { order: item2.order });
      await updateDoc(item2Ref, { order: item1.order });
    } catch (error) {
      console.error("Error updating item order", error);
      alert("Error updating item order");
    }
  };

  const handleSelectItemForPriceUpdate = (itemId) => {
    setSelectedItemsForPriceUpdate(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleAdjustPrices = () => {
    if (!priceAdjustmentValue) {
      alert('Bitte geben Sie einen Preisanpassungswert ein.');
      return;
    }

    const adjustmentValue = parseFloat(priceAdjustmentValue);

    if (isNaN(adjustmentValue)) {
      alert('Bitte geben Sie eine gültige Zahl für die Preisanpassung ein.');
      return;
    }

    selectedItemsForPriceUpdate.forEach(itemId => {
      const item = items.find(item => item.id === itemId);
      if (item) {
        const updatedPrice = parseFloat(item.price) + adjustmentValue;
        const formattedPrice = Number.isInteger(updatedPrice) ? updatedPrice.toFixed(0) : updatedPrice.toFixed(2);
        onUpdateItem({ ...item, price: formattedPrice });
      }
    });

    setSelectedItemsForPriceUpdate([]);
    setPriceAdjustmentValue('');
    setIsSelectingItems(false);
  };

  const handleRegionSelect = (regionId) => {
    setSelectedRegion(regionId);
    setRegionSelected(true);
  };

  const handleCopyToRegionForSelected = () => {
    if (!copyToRegionForSelected) {
      alert('Bitte wählen Sie ein Zielgebiet aus.');
      return;
    }

    if (window.confirm(`Möchten Sie wirklich die ausgewählten Artikel nach ${regions.find(r => r.id === copyToRegionForSelected)?.name} kopieren?`)) {
      selectedItemsForPriceUpdate.forEach(itemId => {
        const item = items.find(item => item.id === itemId);
        if (item) {
          const newItem = {
            name: item.name,
            price: item.price,
            regions: [copyToRegionForSelected],
            schutzart: item.schutzart,
            bws: item.bws,
            typ: item.typ,
            art: item.art,
            serie: item.serie,
            material: item.material,
            order: items.length + 1, // Set initial order
          };
          onAddItem(newItem);
        }
      });
      setCopyToRegionForSelected('');
      setSelectedItemsForPriceUpdate([]);
      setIsSelectingItems(false);
    }
  };

  const handleSelectAllItems = () => {
    if (selectAll) {
      setSelectedItemsForPriceUpdate([]);
    } else {
      const allItemIds = sortedItems.map(item => item.id);
      setSelectedItemsForPriceUpdate(allItemIds);
    }
    setSelectAll(!selectAll);
  };

  const handleCopyToAllRegionsForSelected = () => {
    if (window.confirm('Möchten Sie wirklich die ausgewählten Artikel in ALLE anderen Gebiete kopieren?')) {
      const otherRegions = regions.filter(region => region.id !== selectedRegion);
      selectedItemsForPriceUpdate.forEach(itemId => {
        const item = items.find(item => item.id === itemId);
        if (item) {
          otherRegions.forEach(targetRegion => {
            const newItem = {
              name: item.name,
              price: item.price,
              regions: [targetRegion.id],
              schutzart: item.schutzart,
              bws: item.bws,
              typ: item.typ,
              art: item.art,
              serie: item.serie,
              material: item.material,
              order: items.length + 1, // Set initial order
            };
            onAddItem(newItem);
          });
        }
      });
      setSelectedItemsForPriceUpdate([]);
      setIsSelectingItems(false);
      setSelectAll(false);
    }
  };

  const handleRegionSelectForManagement = (regionId) => {
    setSelectedRegion(regionId);
    setRegionSelected(true);
  };

  return (
    <div>
      <h2>Artikel erstellen</h2>
      {selectedRegionName && <h3>Aktuelles Gebiet: {selectedRegionName}</h3>}
      {!regionSelected ? (
        <div className="region-tiles-container">
          {regions.map(region => (
            <div
              key={region.id}
              className="region-tile"
              onClick={() => handleRegionSelectForManagement(region.id)}
            >
              {region.name}
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelectedRegion(''); setRegionSelected(false); setSelectedRegionName(''); }}>Gebiet wechseln</button>
          <form onSubmit={handleSubmit} ref={formRef}>
            <input
              type="text"
              placeholder="Artikel Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Preis"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <select value={schutzart} onChange={(e) => setSchutzart(e.target.value)}>
              <option value="">Schutzart</option>
              <option value="IP Hoch">IP Hoch</option>
              <option value="IP Niedrig">IP Niedrig</option>
            </select>

            <select value={bws} onChange={(e) => setBws(e.target.value)}>
              <option value="">BWS</option>
              <option value="BWS Ja">BWS Ja</option>
              <option value="BWS Nein">BWS Nein</option>
            </select>

            <select value={typ} onChange={(e) => setTyp(e.target.value)}>
              <option value="">Typ</option>
              <option value="RZ">RZ</option>
              <option value="SL">SL</option>
              <option value="Modul">Modul</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>

            <select value={art} onChange={(e) => setArt(e.target.value)}>
              <option value="">Art</option>
              <option value="EZB">EZB</option>
              <option value="EVG">EVG</option>
            </select>

            <select value={serie} onChange={(e) => setSerie(e.target.value)}>
              <option value="">Serie</option>
              <option value="Display">Display</option>
              <option value="Würfel">Würfel</option>
              <option value="Kompakt">Kompakt</option>
              <option value="Kombi">Kombi</option>
              <option value="Spot">Spot</option>
              <option value="Trapez">Trapez</option>
              <option value="Fokus">Fokus</option>
              <option value="SUB">SUB</option>
              <option value="Sonder">Sonder</option>
            </select>

            <select value={material} onChange={(e) => setMaterial(e.target.value)}>
              <option value="">Material</option>
              <option value="Stahl">Stahl</option>
              <option value="Alu">Alu</option>
              <option value="PC">PC</option>
              <option value="Edelstahl">Edelstahl</option>
              <option value="Sonder">Sonder</option>
            </select>

            <button type="submit">{editingItemId ? 'Update Artikel' : 'Artikel hinzufügen'}</button>
            {editingItemId && (
              <button
                type="button"
                onClick={handleCopyItem}
                style={{ backgroundColor: '#3498db', color: 'white' }}
                className="copy-button"
              >
                Artikel kopieren
              </button>
            )}
          </form>
          {copySuccess && <div className="success-message">Artikel erfolgreich kopiert!</div>}
          <select value={copyToRegion} onChange={(e) => setCopyToRegion(e.target.value)}>
            <option value="">Zielgebiet auswählen</option>
            {regions.map(region => (
              <option key={region.id} value={region.id}>{region.name}</option>
            ))}
          </select>
          <button onClick={handleCopyToRegion}>Artikel in Gebiet kopieren</button>
          <button className="delete-button" onClick={handleDeleteAllItems}>Alle Artikel im Gebiet löschen</button>

          <button onClick={() => setIsSelectingItems(!isSelectingItems)}>
            {isSelectingItems ? 'Auswahl beenden' : 'Artikel auswählen'}
          </button>

          {isSelectingItems && (
            <>
              <button onClick={handleSelectAllItems}>{selectAll ? 'Auswahl aufheben' : 'Alle auswählen'}</button>
              <input
                type="number"
                placeholder="Preisanpassungswert"
                value={priceAdjustmentValue}
                onChange={(e) => setPriceAdjustmentValue(e.target.value)}
              />
              <button onClick={handleAdjustPrices}>Preise anpassen</button>

              <select value={copyToRegionForSelected} onChange={(e) => setCopyToRegionForSelected(e.target.value)}>
                <option value="">Zielgebiet auswählen (für ausgewählte Artikel)</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
              <button onClick={handleCopyToRegionForSelected}>Ausgewählte Artikel in Gebiet kopieren</button>
              <button onClick={handleCopyToAllRegionsForSelected}>Ausgewählte Artikel in alle anderen Gebiete kopieren</button>
            </>
          )}

          <input
            type="text"
            placeholder="Artikel suchen..."
            value={searchItem}
            onChange={(e) => setSearchItem(e.target.value)}
          />

          <ul>
            {sortedItems.map(item => (
              <li key={item.id}>
                <div className="item-container">
                  <div className="item-name-price">
                    {item.name} - {item.price} €
                  </div>
                  <div className="item-properties">
                    Schutzart: {item.schutzart}, BWS: {item.bws}, Typ: {item.typ}, Art: {item.art}, Serie: {item.serie}, Material: {item.material}
                  </div>
                </div>
                {isSelectingItems ? (
                  <input
                    type="checkbox"
                    checked={selectedItemsForPriceUpdate.includes(item.id)}
                    onChange={() => handleSelectItemForPriceUpdate(item.id)}
                  />
                ) : (
                  <>
                    <button onClick={() => moveItemUp(item)}>&#9650;</button>
                    <button onClick={() => moveItemDown(item)}>&#9660;</button>
                    <button onClick={() => handleEditItem(item)}>Bearbeiten</button>
                    <button className="delete-button" onClick={() => handleDeleteItem(item.id)}>Löschen</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ItemManagement;
