import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {Equipment, Room, RoomType, Subject} from "@/types.ts";

export const useStore = defineStore('store', () => {
    const subjects = ref<Subject[]>([])
    const equipments = ref<Equipment[]>([])
    const roomTypes = ref<RoomType[]>([])
    const rooms = ref<Room>([])

    function addSubject(name: string, shortName: string, code: string, color: string) {
        subjects.value.push({ id: subjects.value.length + 1, name, shortName, code, color })
    }

    function createEquipment(id: number, name: string) {
        equipments.value.push({ id, name })
    }

    function createRoomType(id: number, name: string) {
        roomTypes.value.push({ id, name })
    }

    function createRoom(id: number, name: string, capacity: number, roomType: RoomType, equipment: Equipment[]) {
        rooms.value.push({ id, name, capacity, roomType, equipment })
    }

    addSubject('Analýza a zložitosť algoritmov', 'AZA', 'B-AZA', '#FF0000')
    addSubject('Databázové systémy', 'DBS', 'B-DBS', '#00FF00')
    addSubject('Dátové štruktúry', 'DS', 'B-DS', '#0000FF')

    createEquipment(1, 'Elektrické plátno')
    createEquipment(2, 'Študentský počítač')
    createEquipment(3, 'Televízor')
    createEquipment(4, 'Tabuľa')
    createEquipment(5, 'Dataprojektor')
    createEquipment(6, 'Katedrový (učiteľský) počítač')
    createEquipment(7, 'Videoprehrávač')
    createEquipment(8, 'Spätný projektor')
    createEquipment(9, 'Vizualizér')
    createEquipment(10, 'CD/audio prehrávač')
    createEquipment(11, 'Interaktívna tabuľa')
    createEquipment(12, 'Tlačiareň')
    createEquipment(13, 'Rysovací stôl')
    createEquipment(14, 'Reprosústava')
    createEquipment(15, 'Webová kamera')
    createEquipment(16, 'AV receiver')
    createEquipment(17, 'Terminál')
    createEquipment(18, 'Presvetľovací stôl')

    createRoomType(1, 'Laboratórium')
    createRoomType(2, 'Učebňa')
    createRoomType(3, 'Zasadačka')
    createRoomType(4, 'Učebňa jazyková')
    createRoomType(5, 'Prednášková sála')
    createRoomType(6, 'Laboratórium výpočtové')
    createRoomType(7, 'Bazén')
    createRoomType(8, 'Učebňa počítačová')
    createRoomType(9, 'Poslucháreň')
    createRoomType(10, 'Iné použitie')
    createRoomType(11, 'Telocvičňa veľká')
    createRoomType(12, 'Telocvičňa malá')
    createRoomType(13, 'Posilňovňa')
    createRoomType(14, 'Knižnica, učebňa')
    createRoomType(15, 'Kresliareň')
    createRoomType(16, 'Knižnica')
    createRoomType(17, 'Telocvičňa')
    createRoomType(18, 'Miestnosť špecializovaná')
    createRoomType(19, 'Zasadačka, spol. miestnosť')


    createRoom(1, 'a201', 20, roomTypes.value[1], [equipments.value[1]])
    createRoom(2, 'a202', 22, roomTypes.value[1], [equipments.value[1]])
    createRoom(3, 'a204', 20, roomTypes.value[1], [equipments.value[1]])
    createRoom(4, 'ab150', 150, roomTypes.value[1], [equipments.value[1]])
    createRoom(5, 'ab300', 300, roomTypes.value[1], [equipments.value[1]])
    createRoom(6, 'ab35', 35, roomTypes.value[1], [equipments.value[1]])
    createRoom(7, 'bc150', 150, roomTypes.value[1], [equipments.value[1]])
    createRoom(8, 'bc300', 300, roomTypes.value[1], [equipments.value[1]])
    createRoom(9, 'bc35', 35, roomTypes.value[1], [equipments.value[1]])

    return { subjects, equipments, roomTypes, rooms }
})