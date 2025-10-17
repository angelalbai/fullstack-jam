import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.companies import (
    CompanyBatchOutput,
    fetch_companies_with_liked,
)
# New imports
from typing import List
from backend.db.database import CompanyCollectionAssociation
from fastapi import HTTPException


router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)

# PYDANTIC MODELS
############################################################
class AddCompaniesToCollectionRequest(BaseModel):
    target_collection_id: uuid.UUID
    company_ids: List[int]  # List of company IDs to add

class AddAllCompaniesRequest(BaseModel):
    source_collection_id: uuid.UUID
    target_collection_id: uuid.UUID
############################################################

class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass

# POST REQUEST FOR ADDING SELECTED COMPANIES
############################################################
@router.post("/add-companies")
def add_companies_to_collection(
    request: AddCompaniesToCollectionRequest,
    db: Session = Depends(database.get_db),
):
    # Check target collection exists
    collection = db.query(database.CompanyCollection).filter_by(id=request.target_collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Target collection not found")

    # Prepare new associations, avoiding duplicates by checking existing first
    existing_assocs = db.query(CompanyCollectionAssociation).filter(
        CompanyCollectionAssociation.collection_id == request.target_collection_id,
        CompanyCollectionAssociation.company_id.in_(request.company_ids),
    ).all()

    existing_company_ids = {assoc.company_id for assoc in existing_assocs}
    new_company_ids = [cid for cid in request.company_ids if cid not in existing_company_ids]

    # Create new associations
    new_associations = [
        CompanyCollectionAssociation(company_id=cid, collection_id=request.target_collection_id)
        for cid in new_company_ids
    ]

    db.bulk_save_objects(new_associations)
    db.commit()

    return {
        "added_count": len(new_associations),
        "already_in_collection": len(existing_company_ids),
    }
############################################################

# POST REQUEST FOR ADDING ALL COMPANIES
############################################################
@router.post("/add-all-companies")
def add_all_companies_to_collection(
    request: AddAllCompaniesRequest,
    db: Session = Depends(database.get_db),
):
    # Validate that both collections exist
    source = db.query(database.CompanyCollection).filter_by(id=request.source_collection_id).first()
    target = db.query(database.CompanyCollection).filter_by(id=request.target_collection_id).first()

    if not source:
        raise HTTPException(status_code=404, detail="Source collection not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target collection not found")

    # Fetch all company IDs from the source collection
    source_company_ids = db.query(CompanyCollectionAssociation.company_id).filter(
        CompanyCollectionAssociation.collection_id == request.source_collection_id
    ).all()

    # Flatten to a list of integers
    source_company_ids = [row[0] for row in source_company_ids]

    if not source_company_ids:
        return {
            "added_count": 0,
            "already_in_collection": 0
        }

    # Check for already existing associations in the target collection
    existing_assocs = db.query(CompanyCollectionAssociation.company_id).filter(
        CompanyCollectionAssociation.collection_id == request.target_collection_id,
        CompanyCollectionAssociation.company_id.in_(source_company_ids)
    ).all()

    existing_company_ids = {row[0] for row in existing_assocs}

    new_company_ids = [
        cid for cid in source_company_ids if cid not in existing_company_ids
    ]

    # Create new association entries
    new_assocs = [
        CompanyCollectionAssociation(
            collection_id=request.target_collection_id,
            company_id=cid
        )
        for cid in new_company_ids
    ]

    db.bulk_save_objects(new_assocs)
    db.commit()

    return {
        "added_count": len(new_assocs),
        "already_in_collection": len(existing_company_ids)
    }

############################################################

@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )

    total_count = query.with_entities(func.count()).scalar()

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )
