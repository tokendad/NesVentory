class NiimbotPacket:
    def __init__(self, type_, data):
        self.type = type_
        self.data = data

    @classmethod
    def from_bytes(cls, pkt):
        if pkt[:2] != b"\x55\x55":
            raise ValueError(f"Invalid packet header: {pkt[:2].hex()} (expected 5555)")
        if pkt[-2:] != b"\xaa\xaa":
            raise ValueError(f"Invalid packet footer: {pkt[-2:].hex()} (expected aaaa)")
        
        type_ = pkt[2]
        len_ = pkt[3]
        data = pkt[4 : 4 + len_]

        checksum = type_ ^ len_
        for i in data:
            checksum ^= i
        
        if checksum != pkt[-3]:
            raise ValueError(f"Invalid checksum: {pkt[-3]:#02x} (calculated {checksum:#02x})")

        return cls(type_, data)

    def to_bytes(self):
        checksum = self.type ^ len(self.data)
        for i in self.data:
            checksum ^= i
        return bytes(
            (0x55, 0x55, self.type, len(self.data), *self.data, checksum, 0xAA, 0xAA)
        )

    def __repr__(self):
        return f"<NiimbotPacket type={self.type} data={self.data}>"
