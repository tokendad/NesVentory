import React, { useState, useEffect } from "react";
import type { Item, Location } from "../lib/api";
import { fetchItems, createItem, deleteItem } from "../lib/api";

interface LivingTabProps {
  location: Location;
  onUpdate: () => void;
}

const LivingTab: React.FC<LivingTabProps> = ({ location, onUpdate }) => {
  const [livingItems, setLivingItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Load living items for this location
  useEffect(() => {
    loadLivingItems();
  }, [location.id]);

  const loadLivingItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all items and filter for living items at this location
      const allItems = await fetchItems();
      const filtered = allItems.filter(
        (item) =>
          item.is_living &&
          item.location_id?.toString() === location.id.toString()
      );
      
      setLivingItems(filtered);
    } catch (err) {
      setError("Failed to load living items");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async () => {
    try {
      setError(null);
      await createItem({
        name: "New Person",
        description: "",
        is_living: true,
        relationship_type: "other",
        location_id: location.id as string,
      });
      await loadLivingItems();
      onUpdate();
      setShowAddMenu(false);
    } catch (err: any) {
      setError(err.message || "Failed to add person");
    }
  };

  const handleAddPet = async () => {
    try:
      setError(null);
      await createItem({
        name: "New Pet",
        description: "",
        is_living: true,
        relationship_type: "pet",
        location_id: location.id as string,
      });
      await loadLivingItems();
      onUpdate();
      setShowAddMenu(false);
    } catch (err: any) {
      setError(err.message || "Failed to add pet");
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this living item?")) {
      return;
    }

    try {
      setError(null);
      await deleteItem(itemId);
      await loadLivingItems();
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to delete living item");
    }
  };

  const calculateAge = (birthdate: string | null): string => {
    if (!birthdate) return "";
    
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    const unit = age === 1 ? "year" : "years";
    return `${age} ${unit} old`;
  };

  const formatBirthdate = (birthdate: string | null): string => {
    if (!birthdate) return "";
    return new Date(birthdate).toLocaleDateString();
  };

  // Separate people and pets
  const people = livingItems.filter((item) => item.relationship_type !== "pet");
  const pets = livingItems.filter((item) => item.relationship_type === "pet");

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "1rem" }}>
      {error && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Add button */}
      <div style={{ marginBottom: "1.5rem", position: "relative" }}>
        <button
          className="btn-primary"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          + Add Person or Pet
        </button>

        {showAddMenu && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "0.5rem",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 10,
              minWidth: "150px",
            }}
          >
            <button
              onClick={handleAddPerson}
              style={{
                display: "block",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              👤 Person
            </button>
            <button
              onClick={handleAddPet}
              style={{
                display: "block",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                borderTop: "1px solid #eee",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              🐾 Pet
            </button>
          </div>
        )}
      </div>

      {/* People Section */}
      {people.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "#333" }}>👥 People</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {people.map((person) => (
              <div
                key={person.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                onClick={() => {
                  // TODO: Open person detail modal
                  alert("Person detail modal not yet implemented");
                }}
              >
                {/* Profile photo placeholder */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#4A90E2",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginRight: "1rem",
                    flexShrink: 0,
                  }}
                >
                  👤
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    {person.relationship_type && person.relationship_type !== "other"
                      ? person.relationship_type.charAt(0).toUpperCase() + person.relationship_type.slice(1)
                      : ""}
                    {person.birthdate && (
                      <>
                        {" • "}
                        {calculateAge(person.birthdate)}
                        {" (born "}
                        {formatBirthdate(person.birthdate)}
                        {")"}
                      </>
                    )}
                  </div>
                </div>

                <button
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(person.id);
                  }}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pets Section */}
      {pets.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "#333" }}>🐾 Pets</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pets.map((pet) => (
              <div
                key={pet.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                onClick={() => {
                  // TODO: Open pet detail modal
                  alert("Pet detail modal not yet implemented");
                }}
              >
                {/* Profile photo placeholder */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#E2A24A",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginRight: "1rem",
                    flexShrink: 0,
                  }}
                >
                  🐾
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                    {pet.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    {pet.description}
                    {pet.birthdate && (
                      <>
                        {" • "}
                        {calculateAge(pet.birthdate)}
                        {" (born "}
                        {formatBirthdate(pet.birthdate)}
                        {")"}
                      </>
                    )}
                  </div>
                </div>

                <button
                  className="btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(pet.id);
                  }}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {people.length === 0 && pets.length === 0 && (
        <div
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            color: "#999",
            border: "2px dashed #ddd",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥🐾</div>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            No people or pets added yet
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Click the "+ Add Person or Pet" button above to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default LivingTab;
