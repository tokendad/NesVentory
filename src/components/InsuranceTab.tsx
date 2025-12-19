import React, { useState, useMemo } from "react";
import type { Location, Item, InsuranceInfo, PolicyHolder } from "../lib/api";
import { updateLocation } from "../lib/api";

interface InsuranceTabProps {
  location: Location;
  items: Item[];
  onUpdate: () => void;
}

const InsuranceTab: React.FC<InsuranceTabProps> = ({ location, items, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize insurance info with defaults
  const initialInsuranceInfo: InsuranceInfo = location.insurance_info || {
    company_name: "",
    company_address: "",
    company_email: "",
    company_phone: "",
    agent_name: "",
    policy_number: "",
    primary_holder: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
    additional_holders: [],
    purchase_date: "",
    purchase_price: undefined,
    build_date: "",
  };
  
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo>(initialInsuranceInfo);

  // Calculate total values
  const calculatedValues = useMemo(() => {
    const itemsAtLocation = items.filter(
      (item) => item.location_id?.toString() === location.id.toString()
    );
    
    const totalPurchasePrice = itemsAtLocation.reduce(
      (sum, item) => sum + (item.purchase_price || 0),
      0
    );
    
    const totalEstimatedValue = itemsAtLocation.reduce(
      (sum, item) => sum + (item.estimated_value || 0),
      0
    );
    
    const propertyPurchasePrice = insuranceInfo.purchase_price || 0;
    const propertyValue = location.estimated_property_value || 0;
    
    return {
      totalValueWithItems: propertyPurchasePrice + totalPurchasePrice,
      estimatedValueWithItems: propertyValue + totalEstimatedValue,
    };
  }, [items, location, insuranceInfo.purchase_price]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await updateLocation(location.id.toString(), {
        insurance_info: insuranceInfo,
      });
      setEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to update insurance information");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setInsuranceInfo(initialInsuranceInfo);
    setEditing(false);
    setError(null);
  };

  const handleAddAdditionalHolder = () => {
    setInsuranceInfo({
      ...insuranceInfo,
      additional_holders: [
        ...(insuranceInfo.additional_holders || []),
        { name: "", phone: "", email: "", address: "" },
      ],
    });
  };

  const handleRemoveAdditionalHolder = (index: number) => {
    const updated = [...(insuranceInfo.additional_holders || [])];
    updated.splice(index, 1);
    setInsuranceInfo({
      ...insuranceInfo,
      additional_holders: updated,
    });
  };

  const handleAdditionalHolderChange = (
    index: number,
    field: keyof PolicyHolder,
    value: string
  ) => {
    const updated = [...(insuranceInfo.additional_holders || [])];
    updated[index] = { ...updated[index], [field]: value };
    setInsuranceInfo({
      ...insuranceInfo,
      additional_holders: updated,
    });
  };

  const handlePrintBasic = () => {
    // Create a printable HTML document for basic insurance report
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsAtLocation = items.filter(
      (item) => item.location_id?.toString() === location.id.toString()
    );

    const coverSheet = `
      <div class="cover-page">
        <h1>Insurance Documentation</h1>
        <h2>${location.friendly_name || location.name}</h2>
        <p><strong>Property Address:</strong> ${location.address || "N/A"}</p>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Policy Information</h3>
        <p><strong>Insurance Company:</strong> ${insuranceInfo.company_name || "N/A"}</p>
        <p><strong>Policy Number:</strong> ${insuranceInfo.policy_number || "N/A"}</p>
        <p><strong>Agent:</strong> ${insuranceInfo.agent_name || "N/A"}</p>
        
        <h3>Policy Holder</h3>
        <p><strong>Name:</strong> ${insuranceInfo.primary_holder?.name || "N/A"}</p>
        <p><strong>Phone:</strong> ${insuranceInfo.primary_holder?.phone || "N/A"}</p>
        <p><strong>Email:</strong> ${insuranceInfo.primary_holder?.email || "N/A"}</p>
        
        <h3>Property Values</h3>
        <p><strong>Total Value:</strong> $${calculatedValues.totalValueWithItems.toLocaleString()}</p>
        <p><strong>Estimated Value:</strong> $${calculatedValues.estimatedValueWithItems.toLocaleString()}</p>
      </div>
    `;

    const itemPages = itemsAtLocation.map((item) => `
      <div class="item-page">
        <h2>${location.name}</h2>
        <table>
          <tr><th>Item Name</th><td>${item.name}</td></tr>
          <tr><th>Model #</th><td>${item.model_number || "N/A"}</td></tr>
          <tr><th>Serial #</th><td>${item.serial_number || "N/A"}</td></tr>
          <tr><th>Purchase Price</th><td>${item.purchase_price ? "$" + item.purchase_price.toLocaleString() : "N/A"}</td></tr>
          <tr><th>Purchase Date</th><td>${item.purchase_date || "N/A"}</td></tr>
          <tr><th>Retailer</th><td>${item.retailer || "N/A"}</td></tr>
        </table>
      </div>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Insurance Report - ${location.name}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .cover-page, .item-page { page-break-after: always; padding: 40px; }
            h1 { font-size: 32px; margin-bottom: 10px; }
            h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
            h3 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { font-weight: bold; width: 30%; }
          }
          @media screen {
            body { margin: 20px; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
            .cover-page, .item-page { background: white; padding: 40px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { font-size: 32px; margin-bottom: 10px; }
            h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
            h3 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { font-weight: bold; width: 30%; }
          }
        </style>
      </head>
      <body>
        ${coverSheet}
        ${itemPages}
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintComprehensive = async () => {
    // Create a printable HTML document for comprehensive insurance report with images
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsAtLocation = items.filter(
      (item) => item.location_id?.toString() === location.id.toString()
    );

    const coverSheet = `
      <div class="cover-page">
        <h1>Comprehensive Insurance Documentation</h1>
        <h2>${location.friendly_name || location.name}</h2>
        <p><strong>Property Address:</strong> ${location.address || "N/A"}</p>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Policy Information</h3>
        <p><strong>Insurance Company:</strong> ${insuranceInfo.company_name || "N/A"}</p>
        <p><strong>Policy Number:</strong> ${insuranceInfo.policy_number || "N/A"}</p>
        <p><strong>Agent:</strong> ${insuranceInfo.agent_name || "N/A"}</p>
        
        <h3>Policy Holder</h3>
        <p><strong>Name:</strong> ${insuranceInfo.primary_holder?.name || "N/A"}</p>
        <p><strong>Phone:</strong> ${insuranceInfo.primary_holder?.phone || "N/A"}</p>
        <p><strong>Email:</strong> ${insuranceInfo.primary_holder?.email || "N/A"}</p>
        
        <h3>Property Values</h3>
        <p><strong>Total Value:</strong> $${calculatedValues.totalValueWithItems.toLocaleString()}</p>
        <p><strong>Estimated Value:</strong> $${calculatedValues.estimatedValueWithItems.toLocaleString()}</p>
      </div>
    `;

    const itemPages = itemsAtLocation.map((item) => {
      // Get primary photo and data tag photo for comprehensive print
      const primaryPhoto = item.photos?.find(p => p.is_primary);
      const dataTagPhoto = item.photos?.find(p => p.is_data_tag);
      
      const photosHtml = [];
      if (primaryPhoto) {
        photosHtml.push(`<img src="/api/${primaryPhoto.path}" alt="Primary Photo" style="max-width: 300px; max-height: 300px; margin: 10px;" />`);
      }
      if (dataTagPhoto && dataTagPhoto.id !== primaryPhoto?.id) {
        photosHtml.push(`<img src="/api/${dataTagPhoto.path}" alt="Data Tag" style="max-width: 300px; max-height: 300px; margin: 10px;" />`);
      }
      
      return `
        <div class="item-page">
          <h2>${location.name}</h2>
          ${photosHtml.length > 0 ? `<div class="photos">${photosHtml.join("")}</div>` : ""}
          <table>
            <tr><th>Item Name</th><td>${item.name}</td></tr>
            <tr><th>Model #</th><td>${item.model_number || "N/A"}</td></tr>
            <tr><th>Serial #</th><td>${item.serial_number || "N/A"}</td></tr>
            <tr><th>Purchase Price</th><td>${item.purchase_price ? "$" + item.purchase_price.toLocaleString() : "N/A"}</td></tr>
            <tr><th>Estimated Value</th><td>${item.estimated_value ? "$" + item.estimated_value.toLocaleString() : "N/A"}</td></tr>
            <tr><th>Purchase Date</th><td>${item.purchase_date || "N/A"}</td></tr>
            <tr><th>Retailer</th><td>${item.retailer || "N/A"}</td></tr>
          </table>
        </div>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprehensive Insurance Report - ${location.name}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .cover-page, .item-page { page-break-after: always; padding: 40px; }
            h1 { font-size: 32px; margin-bottom: 10px; }
            h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
            h3 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { font-weight: bold; width: 30%; }
            .photos { margin: 20px 0; text-align: center; }
            .photos img { display: inline-block; }
          }
          @media screen {
            body { margin: 20px; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
            .cover-page, .item-page { background: white; padding: 40px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { font-size: 32px; margin-bottom: 10px; }
            h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
            h3 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { font-weight: bold; width: 30%; }
            .photos { margin: 20px 0; text-align: center; }
            .photos img { display: inline-block; }
          }
        </style>
      </head>
      <body>
        ${coverSheet}
        ${itemPages}
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["Room", "Item Name", "Model #", "Serial #", "Purchase Price", "Purchase Date", "Retailer", "Estimated Value"];
    const rows = [headers];
    
    // Get all items in location and sub-locations
    const allLocationIds = [location.id.toString()];
    // TODO: Add recursive sub-location gathering if needed
    
    const relevantItems = items.filter(item => 
      allLocationIds.includes(item.location_id?.toString() || "")
    );
    
    relevantItems.forEach(item => {
      rows.push([
        location.name,
        item.name,
        item.model_number || "",
        item.serial_number || "",
        item.purchase_price?.toString() || "",
        item.purchase_date || "",
        item.retailer || "",
        item.estimated_value?.toString() || "",
      ]);
    });
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insurance_${location.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Insurance Details</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!editing ? (
            <>
              <button
                className="btn-outline"
                onClick={handlePrintBasic}
              >
                📄 Print Basic
              </button>
              <button
                className="btn-outline"
                onClick={handlePrintComprehensive}
              >
                📋 Print Comprehensive
              </button>
              <button
                className="btn-outline"
                onClick={handleExportCSV}
              >
                📊 Export CSV
              </button>
              <button className="btn-primary" onClick={() => setEditing(true)}>
                Edit
              </button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Insurance Company Information */}
        <div className="form-section">
          <h3>Insurance Company Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company_name">Company Name</label>
              <input
                type="text"
                id="company_name"
                value={insuranceInfo.company_name || ""}
                onChange={(e) => setInsuranceInfo({ ...insuranceInfo, company_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="agent_name">Agent Name</label>
              <input
                type="text"
                id="agent_name"
                value={insuranceInfo.agent_name || ""}
                onChange={(e) => setInsuranceInfo({ ...insuranceInfo, agent_name: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="company_address">Company Address</label>
            <input
              type="text"
              id="company_address"
              value={insuranceInfo.company_address || ""}
              onChange={(e) => setInsuranceInfo({ ...insuranceInfo, company_address: e.target.value })}
              disabled={!editing}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company_email">Email</label>
              <input
                type="email"
                id="company_email"
                value={insuranceInfo.company_email || ""}
                onChange={(e) => setInsuranceInfo({ ...insuranceInfo, company_email: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="company_phone">Phone</label>
              <input
                type="tel"
                id="company_phone"
                value={insuranceInfo.company_phone || ""}
                onChange={(e) => setInsuranceInfo({ ...insuranceInfo, company_phone: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="policy_number">Policy Number</label>
            <input
              type="text"
              id="policy_number"
              value={insuranceInfo.policy_number || ""}
              onChange={(e) => setInsuranceInfo({ ...insuranceInfo, policy_number: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>

        {/* Primary Policy Holder */}
        <div className="form-section">
          <h3>Primary Policy Holder</h3>
          <div className="form-group">
            <label htmlFor="primary_holder_name">Name</label>
            <input
              type="text"
              id="primary_holder_name"
              value={insuranceInfo.primary_holder?.name || ""}
              onChange={(e) =>
                setInsuranceInfo({
                  ...insuranceInfo,
                  primary_holder: { ...insuranceInfo.primary_holder, name: e.target.value },
                })
              }
              disabled={!editing}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="primary_holder_phone">Phone</label>
              <input
                type="tel"
                id="primary_holder_phone"
                value={insuranceInfo.primary_holder?.phone || ""}
                onChange={(e) =>
                  setInsuranceInfo({
                    ...insuranceInfo,
                    primary_holder: { ...insuranceInfo.primary_holder, phone: e.target.value },
                  })
                }
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="primary_holder_email">Email</label>
              <input
                type="email"
                id="primary_holder_email"
                value={insuranceInfo.primary_holder?.email || ""}
                onChange={(e) =>
                  setInsuranceInfo({
                    ...insuranceInfo,
                    primary_holder: { ...insuranceInfo.primary_holder, email: e.target.value },
                  })
                }
                disabled={!editing}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="primary_holder_address">Address (if different from location)</label>
            <input
              type="text"
              id="primary_holder_address"
              value={insuranceInfo.primary_holder?.address || ""}
              onChange={(e) =>
                setInsuranceInfo({
                  ...insuranceInfo,
                  primary_holder: { ...insuranceInfo.primary_holder, address: e.target.value },
                })
              }
              disabled={!editing}
              placeholder={location.address || ""}
            />
          </div>
        </div>

        {/* Additional Policy Holders */}
        <div className="form-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3>Additional Policy Holders</h3>
            {editing && (
              <button className="btn-outline" onClick={handleAddAdditionalHolder}>
                + Add Holder
              </button>
            )}
          </div>
          
          {(insuranceInfo.additional_holders || []).length === 0 ? (
            <p style={{ color: "var(--muted)", fontStyle: "italic" }}>
              No additional policy holders added.
            </p>
          ) : (
            (insuranceInfo.additional_holders || []).map((holder, index) => (
              <div key={index} style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(15, 23, 42, 0.5)", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong>Holder #{index + 1}</strong>
                  {editing && (
                    <button
                      className="btn-outline"
                      onClick={() => handleRemoveAdditionalHolder(index)}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={holder.name || ""}
                    onChange={(e) => handleAdditionalHolderChange(index, "name", e.target.value)}
                    disabled={!editing}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={holder.phone || ""}
                      onChange={(e) => handleAdditionalHolderChange(index, "phone", e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={holder.email || ""}
                      onChange={(e) => handleAdditionalHolderChange(index, "email", e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={holder.address || ""}
                    onChange={(e) => handleAdditionalHolderChange(index, "address", e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Property Details */}
        <div className="form-section">
          <h3>Property Details</h3>
          <div className="form-group">
            <label htmlFor="location_address">Property Address</label>
            <input
              type="text"
              id="location_address"
              value={location.address || ""}
              disabled
              style={{ backgroundColor: "rgba(100, 100, 100, 0.2)" }}
            />
            <span className="help-text">Address is managed in the main location settings</span>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_date">Purchase Date</label>
              <input
                type="date"
                id="purchase_date"
                value={insuranceInfo.purchase_date || ""}
                onChange={(e) => setInsuranceInfo({ ...insuranceInfo, purchase_date: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label htmlFor="purchase_price">Purchase Price</label>
              <input
                type="number"
                id="purchase_price"
                value={insuranceInfo.purchase_price ?? ""}
                onChange={(e) =>
                  setInsuranceInfo({
                    ...insuranceInfo,
                    purchase_price: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                step="0.01"
                min="0"
                disabled={!editing}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="build_date">Build Date (if known)</label>
            <input
              type="date"
              id="build_date"
              value={insuranceInfo.build_date || ""}
              onChange={(e) => setInsuranceInfo({ ...insuranceInfo, build_date: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>

        {/* Calculated Values */}
        <div className="form-section">
          <h3>Calculated Values</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Total Value (Property + Items Purchase Price)</label>
              <input
                type="text"
                value={`$${calculatedValues.totalValueWithItems.toLocaleString()}`}
                disabled
                style={{ backgroundColor: "rgba(78, 205, 196, 0.1)", fontWeight: "bold" }}
              />
            </div>
            <div className="form-group">
              <label>Estimated Value (Property + Items Estimated Value)</label>
              <input
                type="text"
                value={`$${calculatedValues.estimatedValueWithItems.toLocaleString()}`}
                disabled
                style={{ backgroundColor: "rgba(78, 205, 196, 0.1)", fontWeight: "bold" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsuranceTab;
