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

package restapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/minio/minio/pkg/madmin"
)

// shortTraceMsg Short trace record
type shortTraceMsg struct {
	Host       string    `json:"host"`
	Time       string    `json:"time"`
	Client     string    `json:"client"`
	CallStats  callStats `json:"callStats"`
	FuncName   string    `json:"api"`
	Path       string    `json:"path"`
	Query      string    `json:"query"`
	StatusCode int       `json:"statusCode"`
	StatusMsg  string    `json:"statusMsg"`
}

type callStats struct {
	Rx       int    `json:"rx"`
	Tx       int    `json:"tx"`
	Duration string `json:"duration"`
	Ttfb     string `json:"timeToFirstByte"`
}

// startTraceInfo starts trace of the servers
func startTraceInfo(ctx context.Context, conn WSConn, client MinioAdmin) error {
	// trace all traffic
	allTraffic := true
	// Trace failed requests only
	errOnly := false
	// Start listening on all trace activity.
	traceCh := client.serviceTrace(ctx, allTraffic, errOnly)
	for {
		select {
		case <-ctx.Done():
			return nil
		case traceInfo, ok := <-traceCh:
			// zero value returned because the channel is closed and empty
			if !ok {
				return nil
			}
			if traceInfo.Err != nil {
				log.Println("error on serviceTrace:", traceInfo.Err)
				return traceInfo.Err
			}
			// Serialize message to be sent
			traceInfoBytes, err := json.Marshal(shortTrace(&traceInfo))
			if err != nil {
				fmt.Println("error on json.Marshal:", err)
				return err
			}
			// Send Message through websocket connection
			err = conn.writeMessage(websocket.TextMessage, traceInfoBytes)
			if err != nil {
				log.Println("error writeMessage:", err)
				return err
			}
		}
	}
}

// shortTrace creates a shorter Trace Info message.
//   Same implementation as github/minio/mc/cmd/admin-trace.go
func shortTrace(info *madmin.ServiceTraceInfo) shortTraceMsg {
	t := info.Trace
	s := shortTraceMsg{}

	s.Time = t.ReqInfo.Time.String()
	s.Path = t.ReqInfo.Path
	s.Query = t.ReqInfo.RawQuery
	s.FuncName = t.FuncName
	s.StatusCode = t.RespInfo.StatusCode
	s.StatusMsg = http.StatusText(t.RespInfo.StatusCode)
	s.CallStats.Duration = t.CallStats.Latency.String()
	s.CallStats.Rx = t.CallStats.InputBytes
	s.CallStats.Tx = t.CallStats.OutputBytes

	if host, ok := t.ReqInfo.Headers["Host"]; ok {
		s.Host = strings.Join(host, "")
	}
	cSlice := strings.Split(t.ReqInfo.Client, ":")
	s.Client = cSlice[0]
	return s
}
