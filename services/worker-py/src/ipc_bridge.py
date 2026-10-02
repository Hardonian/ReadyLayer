"""Fast Inter-Process Communication (IPC) Bridge for Python Workhorse Worker.

Provides high-throughput, low-latency (<50ms) task invocation between
the Next.js Node runtime and the Python worker service via JSON-RPC over
Unix Domain Sockets or TCP loopback.
"""

import asyncio
import json
import os
import sys
import traceback
from typing import Any, Dict

from src.handlers import get_handler, list_registered_handlers
from src.utils.logging import get_logger

logger = get_logger(__name__)

DEFAULT_IPC_HOST = os.environ.get("PYTHON_WORKER_IPC_HOST", "127.0.0.1")
DEFAULT_IPC_PORT = int(os.environ.get("PYTHON_WORKER_IPC_PORT", "50051"))
DEFAULT_SOCKET_PATH = os.environ.get("PYTHON_WORKER_SOCKET_PATH", "/tmp/readylayer-worker.sock")


async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    """Handle incoming JSON-RPC IPC requests."""
    peer = writer.get_extra_info("peername")
    logger.info("IPC client connected", peer=str(peer))

    try:
        while True:
            line = await reader.readline()
            if not line:
                break

            try:
                request = json.loads(line.decode("utf-8").strip())
            except Exception as e:
                response = {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error", "data": str(e)}, "id": None}
                writer.write(json.dumps(response).encode("utf-8") + b"\n")
                await writer.drain()
                continue

            req_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})

            if method == "ping":
                response = {
                    "jsonrpc": "2.0",
                    "result": {
                        "status": "ok",
                        "handlers": list_registered_handlers(),
                        "pid": os.getpid(),
                    },
                    "id": req_id,
                }
            elif method == "execute":
                job_type = params.get("job_type")
                payload = params.get("payload", {})

                handler = get_handler(job_type)
                if not handler:
                    response = {
                        "jsonrpc": "2.0",
                        "error": {
                            "code": -32601,
                            "message": f"Handler not found for job_type: {job_type}",
                        },
                        "id": req_id,
                    }
                else:
                    try:
                        # Context dictionary passed to handlers
                        context = {"worker_id": f"ipc_{os.getpid()}", "mode": "direct_ipc"}
                        result = handler(payload, context)
                        response = {"jsonrpc": "2.0", "result": result, "id": req_id}
                    except Exception as handler_err:
                        logger.error("IPC handler execution failed", error=str(handler_err), exc=traceback.format_exc())
                        response = {
                            "jsonrpc": "2.0",
                            "error": {
                                "code": -32000,
                                "message": str(handler_err),
                                "data": traceback.format_exc(),
                            },
                            "id": req_id,
                        }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                    "id": req_id,
                }

            writer.write(json.dumps(response).encode("utf-8") + b"\n")
            await writer.drain()

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error("IPC connection error", error=str(e))
    finally:
        writer.close()
        await writer.wait_closed()


async def start_ipc_server(use_unix_socket: bool = False) -> asyncio.Server:
    """Start IPC server either on Unix domain socket or TCP loopback."""
    if use_unix_socket and hasattr(asyncio, "start_unix_server") and sys.platform != "win32":
        if os.path.exists(DEFAULT_SOCKET_PATH):
            os.remove(DEFAULT_SOCKET_PATH)
        server = await asyncio.start_unix_server(handle_client, path=DEFAULT_SOCKET_PATH)
        logger.info(f"Python worker IPC listening on Unix socket: {DEFAULT_SOCKET_PATH}")
    else:
        server = await asyncio.start_server(handle_client, host=DEFAULT_IPC_HOST, port=DEFAULT_IPC_PORT)
        logger.info(f"Python worker IPC listening on TCP: {DEFAULT_IPC_HOST}:{DEFAULT_IPC_PORT}")

    return server


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = loop.run_until_complete(start_ipc_server())
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()
        loop.run_until_complete(server.wait_closed())
        loop.close()
