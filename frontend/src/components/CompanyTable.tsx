import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, addCompaniesToCollection } from "../utils/jam-api"; // imported addCompaniesToCollection

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);

  // MY CODE
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  ////////////////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize]);

  useEffect(() => {
    setOffset(0);
  }, [props.selectedCollectionId]);

  // MY CODE

  const handleAddToList = async () => {
    const targetCollectionId = prompt("Enter target collection ID:"); // or use a dropdown
    if (!targetCollectionId) return;

    setStatus("loading");

    try {
      const result = await addCompaniesToCollection(
        targetCollectionId,
        selectedIds
      );
      setStatus("success");
      alert(
        `Added ${result.added_count} companies. Skipped ${result.already_in_collection}.`
      );
    } catch (error) {
      setStatus("error");
      alert("Failed to add companies.");
      console.error(error);
    }
  };

  //////////////////////////////////////////////////////////////////////////////////////////

    return (
    <div style={{ height: 600, width: "100%" }}>
      <div className="mb-2">
        <button
          disabled={selectedIds.length === 0 || status === "loading"}
          onClick={handleAddToList}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {status === "loading" ? "Adding..." : "Add to Another List"}
        </button>
      </div>
      <DataGrid
        rows={response}
        rowHeight={30}
        columns={[
          { field: "liked", headerName: "Liked", width: 90 },
          { field: "id", headerName: "ID", width: 90 },
          { field: "company_name", headerName: "Company Name", width: 200 },
        ]}
        checkboxSelection
        pagination
        rowCount={total}
        paginationMode="server"
        onRowSelectionModelChange={(ids) =>
          setSelectedIds(ids as number[])
        }
        onPaginationModelChange={(newMeta) => {
          setPageSize(newMeta.pageSize);
          setOffset(newMeta.page * newMeta.pageSize);
        }}
      />
    </div>
  );
};

//   return (
//     <div style={{ height: 600, width: "100%" }}>
//       <DataGrid
//         rows={response}
//         rowHeight={30}
//         columns={[
//           { field: "liked", headerName: "Liked", width: 90 },
//           { field: "id", headerName: "ID", width: 90 },
//           { field: "company_name", headerName: "Company Name", width: 200 },
//         ]}
//         initialState={{
//           pagination: {
//             paginationModel: { page: 0, pageSize: 25 },
//           },
//         }}
//         rowCount={total}
//         pagination
//         checkboxSelection
//         paginationMode="server"
//         onPaginationModelChange={(newMeta) => {
//           setPageSize(newMeta.pageSize);
//           setOffset(newMeta.page * newMeta.pageSize);
//         }}
//       />
//     </div>
//   );
// };

export default CompanyTable;
