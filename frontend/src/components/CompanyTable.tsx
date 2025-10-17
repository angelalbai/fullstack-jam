import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, addCompaniesToCollection, addAllCompaniesToCollection } from "../utils/jam-api"; // imported addCompaniesToCollection
import LinearProgress from "@mui/material/LinearProgress"; // loading bar
import Alert from '@mui/material/Alert'; // alert messages


const CompanyTable = (props: { selectedCollectionId: string; collections: { id: string; collection_name: string }[] }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);

  // MY CODE
  ////////////////////////////////////////////////////////////////////////////////////////
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
  const [isAdding, setIsAdding] = useState(false);
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
  ////////////////////////////////////////////////////////////////////////////////////////
  const handleAddToList = async () => {
    if (!selectedTargetId) return;

    setIsAdding(true);

    try {
      const result = await addCompaniesToCollection(
        selectedTargetId,
        selectedIds
      );
      setAlertSeverity('success');
      setAlertMessage(`Added ${result.added_count} companies. Skipped ${result.already_in_collection}.`);
      setTimeout(() => setAlertMessage(null), 5000);

    } catch (error) {
      setAlertSeverity('error');
      setAlertMessage('Failed to add companies.');
      console.error(error);
      setTimeout(() => setAlertMessage(null), 5000);

    } finally {
      setIsAdding(false);
    }
  };

  ////////////////////////////////////////////////////////////////////////////////////////

    return (
    <div style={{ height: 600, width: "100%" }}>
      {alertMessage && (
        <div className="mb-4">
          <Alert
            severity={alertSeverity}
            onClose={() => setAlertMessage(null)} // allows dismissing
          >
            {alertMessage}
          </Alert>
        </div>
      )}
      <div className="mb-2 flex gap-4 items-center">
        <select
          className="p-2 border rounded bg-white text-black"
          value={selectedTargetId || ""}
          onChange={(e) => setSelectedTargetId(e.target.value)}
        >
          <option value="" disabled>
            Select target collection
          </option>
          {props.collections
            .filter((c) => c.id !== props.selectedCollectionId)
            .map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.collection_name}
              </option>
            ))}
        </select>

        {isAdding ? (
          <div className="w-full">
            <LinearProgress />
          </div>
        ) : (
          <button
            disabled={selectedIds.length === 0 || !selectedTargetId}
            onClick={handleAddToList}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:cursor-pointer hover:bg-orange-300"
          >
            Add Selected Companies to Collection
          </button>
        )}
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

export default CompanyTable;
