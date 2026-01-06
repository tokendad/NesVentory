import logging
import re
import json

import click
from PIL import Image

from .printer import BluetoothTransport, PrinterClient, SerialTransport, InfoEnum


def get_transport(conn, addr):
    if conn == "bluetooth":
        assert conn is not None, "--addr argument required for bluetooth connection"
        addr = addr.upper()
        assert re.fullmatch(r"([0-9A-F]{2}:){5}([0-9A-F]{2})", addr), "Bad MAC address"
        return BluetoothTransport(addr)
    if conn == "usb":
        port = addr if addr is not None else "auto"
        return SerialTransport(port=port)
    raise ValueError(f"Unknown connection type: {conn}")


@click.group()
def cli():
    pass


@cli.command("print")
@click.option(
    "-m",
    "--model",
    type=click.Choice(["b1", "b18", "b21", "d11", "d110"], False),
    default="b21",
    show_default=True,
    help="Niimbot printer model",
)
@click.option(
    "-c",
    "--conn",
    type=click.Choice(["usb", "bluetooth"]),
    default="usb",
    show_default=True,
    help="Connection type",
)
@click.option(
    "-a",
    "--addr",
    help="Bluetooth MAC address OR serial device path",
)
@click.option(
    "-d",
    "--density",
    type=click.IntRange(1, 5),
    default=5,
    show_default=True,
    help="Print density",
)
@click.option(
    "-r",
    "--rotate",
    type=click.Choice(["0", "90", "180", "270"]),
    default="0",
    show_default=True,
    help="Image rotation (clockwise)",
)
@click.option(
    "-i",
    "--image",
    type=click.Path(exists=True),
    required=True,
    help="Image path",
)
@click.option(
    "-v",
    "--verbose",
    is_flag=True,
    help="Enable verbose logging",
)
def print_cmd(model, conn, addr, density, rotate, image, verbose):
    logging.basicConfig(
        level="DEBUG" if verbose else "INFO",
        format="%(levelname)s | %(module)s:%(funcName)s:%(lineno)d - %(message)s",
    )

    transport = get_transport(conn, addr)

    if model in ("b1", "b18", "b21"):
        max_width_px = 384
    if model in ("d11", "d110"):
        max_width_px = 96

    if model in ("b18", "d11", "d110") and density > 3:
        logging.warning(f"{model.upper()} only supports density up to 3")
        density = 3

    image = Image.open(image)
    if rotate != "0":
        # PIL library rotates counter clockwise, so we need to multiply by -1
        image = image.rotate(-int(rotate), expand=True)
    assert image.width <= max_width_px, f"Image width too big for {model.upper()}"

    printer = PrinterClient(transport)
    printer.print_image(image, density=density)


@cli.command("info")
@click.option(
    "-c",
    "--conn",
    type=click.Choice(["usb", "bluetooth"]),
    default="usb",
    show_default=True,
    help="Connection type",
)
@click.option(
    "-a",
    "--addr",
    help="Bluetooth MAC address OR serial device path",
)
@click.option(
    "-v",
    "--verbose",
    is_flag=True,
    help="Enable verbose logging",
)
def info_cmd(conn, addr, verbose):
    """Get printer info and RFID status."""
    logging.basicConfig(
        level="DEBUG" if verbose else "INFO",
        format="%(levelname)s | %(module)s:%(funcName)s:%(lineno)d - %(message)s",
    )

    try:
        transport = get_transport(conn, addr)
        printer = PrinterClient(transport)

        print("Fetching Printer Info...")
        try:
            serial = printer.get_info(InfoEnum.DEVICESERIAL)
            print(f"Device Serial: {serial}")
            
            soft_ver = printer.get_info(InfoEnum.SOFTVERSION)
            print(f"Software Version: {soft_ver}")
            
            hard_ver = printer.get_info(InfoEnum.HARDVERSION)
            print(f"Hardware Version: {hard_ver}")
        except Exception as e:
            print(f"Error fetching device info: {e}")

        print("\nFetching RFID Info...")
        try:
            rfid = printer.get_rfid()
            if rfid:
                print(json.dumps(rfid, indent=2))
            else:
                print("No RFID tag detected or read failed.")
        except Exception as e:
            print(f"Error fetching RFID info: {e}")
    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    cli()