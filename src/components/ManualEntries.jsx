import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, setDoc, doc, deleteDoc, onSnapshot } from '../firebase';

function ManualEntries() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    datum: '',
    projektnummer: '',
    projektname: '',
    anlagentyp: '',
    angefragtBei: '',
    angefragtVon: '',
    abgabeBis: '',
    status: 'angefragt', // Set default status to "angefragt"
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [hasOverdueEntries, setHasOverdueEntries] = useState(false);

  useEffect(() => {
    const entriesCollection = collection(db, 'manualEntries');
    const unsubscribe = onSnapshot(entriesCollection, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedEntries = [...entriesData].sort((a, b) => {
        // Sort by 'datum' in descending order (newest first)
        return new Date(b.datum) - new Date(a.datum);
      });
      setEntries(sortedEntries);
      setDbError(null);

      // Check for overdue entries
      const overdue = sortedEntries.some(entry => isPastDueDate(entry.abgabeBis, entry.status));
      setHasOverdueEntries(overdue);
    }, (error) => {
      console.error("Error fetching manual entries:", error);
      setDbError("Fehler beim Laden der Anfragen aus der Datenbank.");
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    setNewEntry({ ...newEntry, [e.target.name]: e.target.value });
  };

  const handleAddEntry = async () => {
    try {
      let entryToAdd = { ...newEntry };
      if (!newEntry.datum) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        entryToAdd = { ...entryToAdd, datum: `${year}-${month}-${day}` };
      }

      const entriesCollection = collection(db, 'manualEntries');
      await addDoc(entriesCollection, entryToAdd);
      setNewEntry({
        datum: '',
        projektnummer: '',
        projektname: '',
        anlagentyp: '',
        angefragtBei: '',
        angefragtVon: '',
        abgabeBis: '',
        status: 'angefragt', // Reset status to "angefragt" for the next entry
      });
      setDbError(null);
    } catch (error) {
      console.error("Error adding manual entry", error);
      setDbError("Fehler beim Hinzufügen der Anfrage zur Datenbank.");
    }
  };

  const handleEditEntry = (index) => {
    setEditingIndex(index);
    setNewEntry(entries[index]);
  };

  const handleUpdateEntry = async () => {
    try {
      const entryDocRef = doc(db, 'manualEntries', entries[editingIndex].id);
      await setDoc(entryDocRef, newEntry);
      const updatedEntries = [...entries];
      updatedEntries[editingIndex] = newEntry;
      setEntries(updatedEntries);
      setEditingIndex(null);
      setNewEntry({
        datum: '',
        projektnummer: '',
        projektname: '',
        anlagentyp: '',
        angefragtBei: '',
        angefragtVon: '',
        abgabeBis: '',
        status: 'angefragt', // Reset status to "angefragt" for the next entry
      });
      setDbError(null);
    } catch (error) {
      console.error("Error updating manual entry", error);
      setDbError("Fehler beim Aktualisieren der Anfrage in der Datenbank.");
    }
  };

  const handleDeleteEntry = async (index) => {
    try {
      const entryDocRef = doc(db, 'manualEntries', entries[index].id);
      await deleteDoc(entryDocRef);
      const updatedEntries = [...entries];
      updatedEntries.splice(index, 1);
      setEntries(updatedEntries);
      setDbError(null);
    } catch (error) {
      console.error("Error deleting manual entry", error);
      setDbError("Fehler beim Löschen der Anfrage aus der Datenbank.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const isPastDueDate = (dueDateString, status) => {
    if (status === 'angebot erhalten') return false;
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    const now = new Date();
    return dueDate < now;
  };

  const getRowStyle = (status) => {
    let backgroundColor = '';
    let color = '#fff'; // Default text color
    switch (status) {
      case 'angefragt':
        return { backgroundColor: '#ffc107', color: '#000' }; // Yellow
      case 'angebot erhalten':
        return { backgroundColor: '#28a745', color: '#fff' }; // Green
      case 'Absage':
        return { backgroundColor: '#dc3545', color: '#fff' }; // Red
      case 'Erinnerung':
        return { backgroundColor: '#007bff', color: '#fff' }; // Blue
      default:
        return {};
    }
    return { backgroundColor, color };
  };

  const getInputRowStyle = () => {
    return { backgroundColor: '#8e44ad', color: '#fff' }; // Purple
  };

  const anlagentypOptions = ["USV", "BSV", "GR", "Bat", "PS", "PP", "PS2", "CSS", "Sibelon", "Merlin", "Sonstiges", "24V", "48V", "60V", "Priorit", "OP"].sort();
  const angefragtBeiOptions = ["Freimann", "Bonecke", "Steuernagel", "Theis", "Sonstige", "Jörger", "Schnell", "ODS", "Landmann", "Beck", "Mayer", "Socomec", "Wabnitz", "Rutz", "JeWo", "Limbach", "Appel", "Schuster", "GFS", "Vertiv"].sort();
  const angefragtVonOptions = ["Fetzer", "Baus", "Ehnert"].sort();
  const statusOptions = ["angefragt", "Absage", "angebot erhalten", "Erinnerung"].sort();

  return (
    <div>
      <h2>
        Anfragen
        {hasOverdueEntries && <span className="overdue-indicator">!</span>}
      </h2>
      {dbError && <div className="error-message">{dbError}</div>}
      <table className="manual-entries-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Projektnummer</th>
            <th>Projektname</th>
            <th>Anlagentyp</th>
            <th>Angefragt bei</th>
            <th>Angefragt von</th>
            <th>Abgabe bis</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr style={getInputRowStyle()}>
            <td><input type="date" name="datum" value={newEntry.datum} onChange={handleInputChange} /></td>
            <td><input type="text" name="projektnummer" value={newEntry.projektnummer} onChange={handleInputChange} /></td>
            <td><input type="text" name="projektname" value={newEntry.projektname} onChange={handleInputChange} /></td>
            <td>
              <select name="anlagentyp" value={newEntry.anlagentyp} onChange={handleInputChange}>
                <option value="">Auswählen</option>
                {anlagentypOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </td>
            <td>
              <select name="angefragtBei" value={newEntry.angefragtBei} onChange={handleInputChange}>
                <option value="">Auswählen</option>
                {angefragtBeiOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </td>
            <td>
              <select name="angefragtVon" value={newEntry.angefragtVon} onChange={handleInputChange}>
                <option value="">Auswählen</option>
                {angefragtVonOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </td>
            <td><input type="date" name="abgabeBis" value={newEntry.abgabeBis} onChange={handleInputChange} /></td>
            <td>
              <select name="status" value={newEntry.status} onChange={handleInputChange}>
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </td>
            <td>
              {editingIndex !== null ? (
                <button onClick={handleUpdateEntry}>Update</button>
              ) : (
                <button onClick={handleAddEntry}>Eintrag hinzufügen</button>
              )}
            </td>
          </tr>
          {entries.map((entry, index) => (
            <tr key={entry.id} style={getRowStyle(entry.status)}>
              <td>{formatDate(entry.datum)}</td>
              <td>{entry.projektnummer}</td>
              <td>{entry.projektname}</td>
              <td>{entry.anlagentyp}</td>
              <td>{entry.angefragtBei}</td>
              <td>{entry.angefragtVon}</td>
              <td>
                {formatDate(entry.abgabeBis)}
                {isPastDueDate(entry.abgabeBis, entry.status) && (
                  <span className="due-date-exceeded">!</span>
                )}
              </td>
              <td>{entry.status}</td>
              <td>
                <button onClick={() => handleEditEntry(index)}>Bearbeiten</button>
                <button onClick={() => handleDeleteEntry(index)}>Löschen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManualEntries;
