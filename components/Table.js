import { formatDate } from "@/utils/utility";
import React from "react";

function Table({ data }) {
  if (!data || data.length === 0) {
    return (
      <div id="table-no-data" className="text-center my-5 text-lg font-semibold text-gray-600">
        No data available.
      </div>
    );
  }

  const columnNames = Object.keys(data[0]);
  return (
    <table id="table-container" className="table">
      <thead>
        <tr>
          {columnNames.map((columnName, index) => (
            <th key={index} scope="col" className="py-3 px-6 text-gray-900 font-semibold">
              {columnName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} className="hover cursor-pointer">
            {columnNames.map((columnName) => (
              <td key={columnName} className="py-4 px-6">
                {columnName === "created_at" ? formatDate(item[columnName]) : item[columnName]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Table;
