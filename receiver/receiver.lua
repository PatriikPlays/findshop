local config = require("config")
local findSourcePos = require("findSourcePos")

for i,v in ipairs(config.modems) do
  peripheral.call(v.name, "closeAll")
  peripheral.call(v.name, "open", config.shopSyncPort)
end

local function receive(outputQueue)
  local function findModem(name)
    for i,v in ipairs(config.modems) do
      if v.name == name then
        return i
      end
    end

    return nil
  end

  local msgBuffer = {}

  parallel.waitForAny(function()
    while true do
      local event, side, channel, replyChannel, msg, distance = os.pullEvent("modem_message")

      distance = distance or -1

      if channel == config.shopSyncPort then
        local modemIndex = findModem(side)
        if modemIndex then
          if type(msg) == "table" and type(msg.info) == "table" then
            msg.info.computerID = msg.info.computerID or replyChannel
          end

          local ser = textutils.serialize(msg)
          if ser then
            msgBuffer[ser] = msgBuffer[ser] or {}
            table.insert(msgBuffer[ser], {
              modem = modemIndex,
              message = msg,
              distance = distance
            })

            if #msgBuffer[ser] >= 4 then
              local modemsUsed = {}
              for i,v in ipairs(msgBuffer[ser]) do
                if not modemsUsed[v.modem] then
                  modemsUsed[v.modem] = v
                else
                  print("KINDA BAD!!, somehow a message was received on the same modem twice, someone mightve sent the same message twice, this could be because someone transmitted the same message twice in a single tick, trying to handle this")
                end
              end

              local allModemsUsed = true
              for i=1,4 do
                if not modemsUsed[i] then allModemsUsed = false; break; end
              end

              if allModemsUsed then
                local t = {}
                for i=1,4 do
                  local modemPos = config.modems[modemsUsed[i].modem].pos
                  local dist = modemsUsed[i].distance

                  t[i] = {modemPos[1],modemPos[2],modemPos[3],dist}
                end

                local result = t[1][4] == -1 and {} or {findSourcePos(t)}
                table.insert(outputQueue, {message=msg, location=result, replyChannel=replyChannel})

                msgBuffer[ser] = nil
              end
            end
          end
        end
      end
    end
  end, function()
    while true do
      for k,v in pairs(msgBuffer) do
        print("BAD!!, message not received on all modems in 1 tick", v)
      end
      msgBuffer = {}
      sleep()
    end
  end)
end

local wsQueue = {}

local function receiveSS()
  while true do
    if #wsQueue > 0 then
      local q = wsQueue[#wsQueue]
      wsQueue[#wsQueue] = nil

      local msg = q.message
      local loc = q.location
      local replyChannel = q.replyChannel

      if type(loc[1]) ~= "number" or loc[1]~=loc[1] then
        loc = nil
      end

      if type(msg) == "table" and type(msg.info) == "table" then
        msg.info.computerID = msg.info.computerID or replyChannel
        msg.info.txLocation = loc
        msg.info.txLocationDim = loc and config.dimension or nil
      end

      local s, res = pcall(textutils.serializeJSON, msg)
      return s, res
    else
      sleep()
    end
  end
end

parallel.waitForAny(function()
  while true do
    local s,e = pcall(function()
      local ws, err = http.websocket({
        url = config.wsServer,
        headers = { ["Authorization"] = config.wsToken },
        timeout = 5
      })

      if not ws then
        error(os.date("!%Y-%m-%dT%H:%M:%SZ").." Failed to connect to WS: " .. err)
      else
        print(os.date("!%Y-%m-%dT%H:%M:%SZ").." Connected to WS")
      end

      while true do
        local ok, msg = receiveSS()

        if ok then
          print(os.date("!%Y-%m-%dT%H:%M:%SZ").." Sending msg")
          if ws then
            print(#msg)
            ws.send(msg)
          else
            error("WS closed")
          end
        else
          print("Received bad data from shop")
        end
      end
    end)

    if not s then printError(e) end
    sleep(2)
  end
end, function()
  receive(wsQueue)
end)