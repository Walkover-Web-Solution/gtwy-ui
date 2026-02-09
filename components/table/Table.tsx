import React from "react";

const GenericTable = ({ headers, data }) => {
  return (
    <div className="relative rounded-xl overflow-x-auto">
      <table className="w-full text-sm text-left rtl:text-right text-base-content">
        <thead className="text-xs text-base-content uppercase bg-base-300">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className="px-6 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-base-200 border-b">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 font-medium text-base-content whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GenericTable;
