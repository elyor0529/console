// This file is part of MinIO Console Server
// Copyright (c) 2020 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { useState, useEffect } from "react";
import get from "lodash/get";
import { createStyles, Theme, withStyles } from "@material-ui/core/styles";
import AddBucket from "../Buckets/ListBuckets/AddBucket";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";
import { Button } from "@material-ui/core";
import { CreateIcon } from "../../../icons";
import { niceBytes } from "../../../common/utils";
import { MinTablePaginationActions } from "../../../common/MinTablePaginationActions";
import { Bucket, BucketList } from "../Buckets/types";
import TableWrapper from "../Common/TableWrapper/TableWrapper";
import api from "../../../common/api";
import history from "../../../history";
import {
  actionsTray,
  searchField,
} from "../Common/FormComponents/common/styleLibrary";

const styles = (theme: Theme) =>
  createStyles({
    seeMore: {
      marginTop: theme.spacing(3),
    },
    paper: {
      display: "flex",
      overflow: "auto",
      flexDirection: "column",
    },

    addSideBar: {
      width: "320px",
      padding: "20px",
    },
    errorBlock: {
      color: "red",
    },
    tableToolbar: {
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(0),
    },
    minTableHeader: {
      color: "#393939",
      "& tr": {
        "& th": {
          fontWeight: "bold",
        },
      },
    },
    usedSpaceCol: {
      width: 150,
    },
    subTitleLabel: {
      alignItems: "center",
      display: "flex",
    },
    ...actionsTray,
    ...searchField,
  });

interface IBrowseBucketsProps {
  classes: any;
}

const BrowseBuckets = ({ classes }: IBrowseBucketsProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [error, setError] = useState<string>("");
  const [records, setRecords] = useState<Bucket[]>([]);
  const [addScreenOpen, setAddScreenOpen] = useState<boolean>(false);
  const [filterBuckets, setFilterBuckets] = useState<string>("");

  const offset = page * rowsPerPage;

  useEffect(() => {
    if (loading) {
      api
        .invoke("GET", `/api/v1/buckets?offset=${offset}&limit=${rowsPerPage}`)
        .then((res: BucketList) => {
          const buckets = get(res, "buckets", []);

          setLoading(false);
          setRecords(buckets);
          setError("");
          // if we get 0 results, and page > 0 , go down 1 page
          if (
            (res.buckets === undefined ||
              res.buckets == null ||
              res.buckets.length === 0) &&
            page > 0
          ) {
            const newPage = page - 1;
            setPage(newPage);
            setLoading(true);
          }
        })
        .catch((err: any) => {
          setLoading(false);
          setError(err);
        });
    }
  }, [loading]);

  const closeAddModalAndRefresh = () => {
    setAddScreenOpen(false);
    setLoading(false);
  };

  const filteredRecords = records
    .filter((b: Bucket) => {
      if (filterBuckets === "") {
        return true;
      }
      return b.name.indexOf(filterBuckets) >= 0;
    })
    .slice(offset, offset + rowsPerPage);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rPP = parseInt(event.target.value, 10);
    setPage(0);
    setRowsPerPage(rPP);
  };

  return (
    <React.Fragment>
      {addScreenOpen && (
        <AddBucket
          open={addScreenOpen}
          closeModalAndRefresh={closeAddModalAndRefresh}
        />
      )}
      <Grid container>
        <Grid item xs={2} className={classes.subTitleLabel}>
          <Typography variant="h6">Buckets</Typography>
        </Grid>
        <Grid item xs={10} className={classes.actionsTray}>
          <TextField
            placeholder="Search Buckets"
            className={classes.searchField}
            id="search-resource"
            label=""
            onChange={(val) => {
              setFilterBuckets(val.target.value);
            }}
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<CreateIcon />}
            onClick={() => {
              setAddScreenOpen(true);
            }}
          >
            Add Bucket
          </Button>
        </Grid>
        <Grid item xs={12}>
          <br />
        </Grid>
        <Grid item xs={12}>
          {error !== "" && <span className={classes.errorBlock}>{error}</span>}
          <TableWrapper
            itemActions={[
              { type: "view", to: `/object-browser`, sendOnlyId: true },
            ]}
            columns={[
              { label: "Name", elementKey: "name" },
              {
                label: "Used Space",
                elementKey: "size",
                renderFunction: niceBytes,
                globalClass: classes.usedSpaceCol,
              },
            ]}
            isLoading={loading}
            records={filteredRecords}
            entityName="Buckets"
            idField="name"
            paginatorConfig={{
              rowsPerPageOptions: [5, 10, 25],
              colSpan: 3,
              count: filteredRecords.length,
              rowsPerPage: rowsPerPage,
              page: page,
              SelectProps: {
                inputProps: { "aria-label": "rows per page" },
                native: true,
              },
              onChangePage: handleChangePage,
              onChangeRowsPerPage: handleChangeRowsPerPage,
              ActionsComponent: MinTablePaginationActions,
            }}
          />
        </Grid>
      </Grid>
    </React.Fragment>
  );
};

export default withStyles(styles)(BrowseBuckets);
